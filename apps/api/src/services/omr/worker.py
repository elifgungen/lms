#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OMR Worker v22 - Bounded CLAHE + Gray-Consensus
Usage: python worker.py <input_file> <template_json> <output_dir>
"""

import sys, os, json, time, traceback
from pathlib import Path

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    import cv2
    import numpy as np
except ImportError:
    print(json.dumps({"error": "OpenCV not installed"}), file=sys.stderr)
    sys.exit(1)

try:
    import fitz
except ImportError:
    fitz = None

DEBUG = os.environ.get('OMR_DEBUG', '0') == '1'
STRICT = os.environ.get('OMR_STRICT', '1') != '0'
PREVIEW_ONLY = os.environ.get('OMR_PREVIEW_ONLY', '0') == '1'
USE_GRID = os.environ.get('OMR_USE_GRID', '0') == '1'

DEFAULT_PAGE_W, DEFAULT_PAGE_H = 1700, 2200
HOUGH_DP, HOUGH_MIN_DIST, HOUGH_PARAM1, HOUGH_PARAM2 = 1.2, 16, 120, 22
HOUGH_MIN_RADIUS, HOUGH_MAX_RADIUS, DOWNSCALE_WIDTH = 6, 16, 1200
ROWS_PER_BLOCK, CHOICES_PER_ROW, EXPECTED_QUESTION_COUNT = 52, 5, 156
ANSWER_X_RATIO_PRIMARY, ANSWER_X_RATIO_FALLBACK = 0.52, 0.45
MARK_TH_FLOOR, MARGIN_TH_FLOOR, Z_TH_OK, Z_TH_FAINT = 0.03, 0.01, 1.1, 1.6  # Loosen thresholds for faint marks
MIN_STRONG_MARKS_FOR_FAINT, MIN_STRONG_FOR_EMPTY_BLOCK = 1, 5  # Raise empty-block threshold
FAINT_MODE = os.environ.get('OMR_FAINT', '0') == '1'
LIMIT_FIRST_BLOCK = os.environ.get('OMR_LIMIT_FIRST_BLOCK', '1') == '1'
MAX_QUESTIONS = int(os.environ.get('OMR_MAX_QUESTIONS', '0') or 0)
OVERRIDE_CORNERS = os.environ.get('OMR_CORNERS')
ANCHORS = os.environ.get('OMR_ANCHORS')
TOP_ROWS_COUNT, DY_CANDIDATES, TOP_ROWS_MIN_SUM = 16, [-22,-18,-14,-10,-6,-2,0,2,6,10,14,18,22], 0.3
RESCUE_DX, RESCUE_DY = [-6,-4,-2,0,2,4,6], [-6,-4,-2,0,2,4,6]
RESCUE_R_SCALES = [0.92, 1.00, 1.08]
CELL_MARGIN = 0.18

def load_image(p):
    ext = Path(p).suffix.lower()
    if ext == '.pdf':
        if not fitz: raise RuntimeError("PyMuPDF not installed")
        doc = fitz.open(p); pix = doc.load_page(0).get_pixmap(dpi=200)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR if pix.n==4 else cv2.COLOR_RGB2BGR); doc.close(); return img
    img = cv2.imread(p)
    if img is None: raise RuntimeError(f"Cannot read: {p}")
    return img

def order_points(pts):
    pts = np.array(pts, dtype=np.float32); rect = np.zeros((4,2), dtype=np.float32)
    s = pts.sum(axis=1); rect[0], rect[2] = pts[np.argmin(s)], pts[np.argmax(s)]
    d = np.diff(pts, axis=1); rect[1], rect[3] = pts[np.argmin(d)], pts[np.argmax(d)]
    return rect

def rough_page_warp(img, tw, th, dd=None):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape)==3 else img
    bl = cv2.GaussianBlur(gray,(5,5),0); ed = cv2.dilate(cv2.Canny(bl,50,150), cv2.getStructuringElement(cv2.MORPH_RECT,(3,3)), iterations=2)
    cnt,_ = cv2.findContours(ed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnt: return img, False
    pc = None
    for c in sorted(cnt, key=cv2.contourArea, reverse=True)[:5]:
        ap = cv2.approxPolyDP(c, 0.02*cv2.arcLength(c,True), True)
        if len(ap)==4: pc = ap.reshape(4,2); break
    if pc is None: h,w = gray.shape[:2]; pc = np.array([[0,0],[w,0],[w,h],[0,h]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(order_points(pc), np.array([[0,0],[tw,0],[tw,th],[0,th]], dtype=np.float32))
    wp = cv2.warpPerspective(img, M, (tw,th))
    if dd: cv2.imwrite(os.path.join(dd,'02_warped.png'), wp)
    return wp, True

def find_corner_marker(roi, corner, min_area=500):
    _,th = cv2.threshold(roi, 80, 255, cv2.THRESH_BINARY_INV)
    cnt,_ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    h,w = roi.shape; cand = []
    for c in cnt:
        a = cv2.contourArea(c)
        if a < min_area: continue
        x,y,bw,bh = cv2.boundingRect(c)
        if not (0.7 < bw/bh < 1.4): continue
        hl = cv2.convexHull(c)
        if cv2.contourArea(hl) > 0 and a/cv2.contourArea(hl) < 0.75: continue
        M = cv2.moments(c)
        if M['m00']==0: continue
        cx,cy = M['m10']/M['m00'], M['m01']/M['m00']
        sc = {'tl':(w-cx)+(h-cy), 'tr':cx+(h-cy), 'br':cx+cy, 'bl':(w-cx)+cy}
        cand.append((cx,cy,sc.get(corner,a)))
    if not cand: return None
    return sorted(cand, key=lambda x:x[2], reverse=True)[0][:2]

def apply_override_corners(img, pw, ph, corners, dd=None):
    try:
        oc = np.array(corners, dtype=np.float32)
        # If normalized 0-1, scale by image size
        h, w = img.shape[:2]
        if oc.max() <= 1.5:
            oc[:, 0] *= w
            oc[:, 1] *= h
        src = order_points(oc)
        dst = np.array([[0,0],[pw,0],[pw,ph],[0,ph]], dtype=np.float32)
        wf = cv2.warpPerspective(img, cv2.getPerspectiveTransform(src,dst), (pw,ph))
        if dd: cv2.imwrite(os.path.join(dd,'01_override_warp.png'), wf)
        return wf, True, None
    except Exception as e:
        return None, False, f"override_failed:{e}"

def normalize_anchor_payload(payload, pw, ph):
    if not payload or not isinstance(payload, dict):
        return None
    out = {}
    for key, value in payload.items():
        if value is None:
            continue
        if isinstance(value, dict) and 'x' in value and 'y' in value:
            x, y = float(value['x']), float(value['y'])
        elif isinstance(value, (list, tuple)) and len(value) >= 2:
            x, y = float(value[0]), float(value[1])
        else:
            continue
        # If normalized 0-1, scale to page size
        if x <= 1.5 and y <= 1.5:
            x *= pw
            y *= ph
        out[key] = [x, y]
    return out or None

def fine_warp_with_corners(wp, tw, th, dd=None):
    gray = cv2.cvtColor(wp, cv2.COLOR_BGR2GRAY) if len(wp.shape)==3 else wp
    h,w = gray.shape

    def detect_corner_squares():
        _, thb = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV+cv2.THRESH_OTSU)
        cnt,_ = cv2.findContours(thb, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        res = {'tl':None,'tr':None,'br':None,'bl':None}
        for c in cnt:
            a = cv2.contourArea(c)
            if a < 300: continue
            x,y,bw,bh = cv2.boundingRect(c)
            ar = bw/float(bh)
            if ar < 0.7 or ar > 1.3: continue
            cx, cy = x + bw/2, y + bh/2
            if cx < w*0.35 and cy < h*0.35:
                if res['tl'] is None or a > res['tl'][2]: res['tl'] = (cx,cy,a)
            if cx > w*0.65 and cy < h*0.35:
                if res['tr'] is None or a > res['tr'][2]: res['tr'] = (cx,cy,a)
            if cx > w*0.65 and cy > h*0.65:
                if res['br'] is None or a > res['br'][2]: res['br'] = (cx,cy,a)
            if cx < w*0.35 and cy > h*0.65:
                if res['bl'] is None or a > res['bl'][2]: res['bl'] = (cx,cy,a)
        if None in res.values(): return None
        return [(res['tl'][0],res['tl'][1]),(res['tr'][0],res['tr'][1]),(res['br'][0],res['br'][1]),(res['bl'][0],res['bl'][1])]

    # Try robust square detection first
    sq = detect_corner_squares()
    if sq:
        src = order_points(np.array(sq, dtype=np.float32))
    else:
        # Fallback to inner corner marker search
        rw,rh = int(w*0.15), int(h*0.12)
        found = []
        for rx,ry,cn in [(0,0,'tl'),(w-rw,0,'tr'),(w-rw,h-rh,'br'),(0,h-rh,'bl')]:
            res = find_corner_marker(gray[ry:ry+rh,rx:rx+rw], cn)
            found.append((rx+res[0],ry+res[1]) if res else None)
        if None in found: return wp, False, "corners missing"
        src = np.array(found, dtype=np.float32)

    mx,my = int(tw*0.03), int(th*0.03)
    dst = np.array([[mx,my],[tw-mx,my],[tw-mx,th-my],[mx,th-my]], dtype=np.float32)
    wf = cv2.warpPerspective(wp, cv2.getPerspectiveTransform(src,dst), (tw,th))
    if dd: cv2.imwrite(os.path.join(dd,'04_final.png'), wf)
    return wf, True, None

def detect_circles(gray, dd=None):
    h,w = gray.shape; sc = DOWNSCALE_WIDTH/w
    sm = cv2.resize(gray, (DOWNSCALE_WIDTH, int(h*sc)), interpolation=cv2.INTER_AREA)
    def run_hough(p2):
        return cv2.HoughCircles(cv2.GaussianBlur(sm,(5,5),0), cv2.HOUGH_GRADIENT, dp=HOUGH_DP, minDist=max(int(HOUGH_MIN_DIST*sc),8), param1=HOUGH_PARAM1, param2=p2, minRadius=max(int(HOUGH_MIN_RADIUS*sc),4), maxRadius=max(int(HOUGH_MAX_RADIUS*sc),10))
    cir = run_hough(HOUGH_PARAM2)
    if cir is None or len(cir[0]) < 300:
        cir = run_hough(max(10, int(HOUGH_PARAM2*0.7)))
    if cir is None: return []
    return [(cx/sc, cy/sc, r/sc) for cx,cy,r in cir[0]]

def isolate_answer_circles(cir, pw, ph):
    if not cir: return []
    ans = [(x,y,r) for x,y,r in cir if x > pw*ANSWER_X_RATIO_PRIMARY]
    if len(ans) < 50: ans = [(x,y,r) for x,y,r in cir if x > pw*ANSWER_X_RATIO_FALLBACK]
    return ans

def cluster_1d(vals, tol):
    if not vals: return []
    sv = np.sort(vals); cl = [[sv[0]]]
    for v in sv[1:]:
        if v - cl[-1][-1] < tol: cl[-1].append(v)
        else: cl.append([v])
    return [np.mean(c) for c in cl]

def build_binary(gray):
    binary = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        25,
        10,
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    return binary

def clamp01(v):
    return max(0.0, min(1.0, float(v)))

def read_grid_answers(binary, cfg, pw, ph, choices, blocks=None):
    qcols = int(cfg.get('questionColumns', 3) or 3)
    qcols = max(1, min(6, qcols))
    rows_per_block = int(cfg.get('rowsPerBlock', ROWS_PER_BLOCK) or ROWS_PER_BLOCK)
    expected = int(cfg.get('expectedQuestionCount', EXPECTED_QUESTION_COUNT) or EXPECTED_QUESTION_COUNT)

    # Prefer using detected answer blocks (from circle clustering) to derive ROI/ranges.
    ranges_px = []
    roi_left = roi_top = 0
    roi_right = pw
    roi_bottom = ph
    if blocks and isinstance(blocks, list) and len(blocks) >= 1:
        sorted_blocks = sorted(blocks, key=lambda b: float(b.get('x_min', 0)))
        roi_left = int(max(0, min(pw - 2, min(float(b.get('x_min', 0)) for b in sorted_blocks))))
        roi_right = int(max(2, min(pw, max(float(b.get('x_max', pw)) for b in sorted_blocks))))
        roi_top = int(max(0, min(ph - 2, min(float(b.get('y_min', 0)) for b in sorted_blocks))))
        roi_bottom = int(max(2, min(ph, max(float(b.get('y_max', ph)) for b in sorted_blocks))))
        # Expand each block horizontally when we detect fewer than 5 distinct x clusters (common in block1).
        for blk in sorted_blocks[:qcols]:
            cir = blk.get('circles', []) or []
            xs = [c[0] for c in cir]
            rs = [c[2] for c in cir]
            mr = float(np.median(rs)) if rs else 12.0
            x_centers = sorted(cluster_1d(xs, max(mr * 1.2, 10.0))) if xs else []
            sp = float(np.median(np.diff(x_centers))) if len(x_centers) >= 2 else max(30.0, mr * 3.0)
            sp = max(24.0, min(120.0, sp))
            x1 = float(blk.get('x_min', 0))
            x2 = float(blk.get('x_max', pw))
            if len(x_centers) < CHOICES_PER_ROW:
                x1 -= sp
            # Small pad to include circle outlines.
            x1 -= mr * 0.8
            x2 += mr * 0.8
            y1 = float(blk.get('y_min', 0)) - mr * 0.8
            y2 = float(blk.get('y_max', ph)) + mr * 0.8
            ranges_px.append({
                'x1': max(0.0, x1),
                'x2': min(float(pw), x2),
                'y1': max(0.0, y1),
                'y2': min(float(ph), y2),
            })
        if ranges_px:
            roi_left = int(max(0, min(pw - 2, min(r['x1'] for r in ranges_px))))
            roi_right = int(max(2, min(pw, max(r['x2'] for r in ranges_px))))
            roi_top = int(max(0, min(ph - 2, min(r['y1'] for r in ranges_px))))
            roi_bottom = int(max(2, min(ph, max(r['y2'] for r in ranges_px))))
    else:
        roiX = float(cfg.get('roiX', 0.0))
        roiY = float(cfg.get('roiY', 0.0))
        roiW = float(cfg.get('roiW', 1.0))
        roiH = float(cfg.get('roiH', 1.0))
        roi_left = int(round(clamp01(roiX) * pw))
        roi_top = int(round(clamp01(roiY) * ph))
        roi_right = roi_left + int(round(clamp01(roiW) * pw))
        roi_bottom = roi_top + int(round(clamp01(roiH) * ph))
        roi_left = max(0, min(pw - 2, roi_left))
        roi_top = max(0, min(ph - 2, roi_top))
        roi_right = max(roi_left + 2, min(pw, roi_right))
        roi_bottom = max(roi_top + 2, min(ph, roi_bottom))

        col_ranges = cfg.get('columnRanges') or []
        if not isinstance(col_ranges, list) or len(col_ranges) != qcols:
            col_ranges = [{'start': i / qcols, 'end': (i + 1) / qcols, 'top': 0, 'bottom': 1} for i in range(qcols)]
        roi_w = roi_right - roi_left
        roi_h = roi_bottom - roi_top
        for block in range(qcols):
            cr = col_ranges[block] if block < len(col_ranges) else {'start': block / qcols, 'end': (block + 1) / qcols, 'top': 0, 'bottom': 1}
            start = clamp01(cr.get('start', 0))
            end = clamp01(cr.get('end', 1))
            top = clamp01(cr.get('top', 0))
            bottom = clamp01(cr.get('bottom', 1))
            if end <= start:
                end = min(1.0, start + 0.02)
            if bottom <= top:
                bottom = min(1.0, top + 0.02)
            ranges_px.append({
                'x1': roi_left + roi_w * start,
                'x2': roi_left + roi_w * end,
                'y1': roi_top + roi_h * top,
                'y2': roi_top + roi_h * bottom,
            })

    roi_w = int(max(2, roi_right - roi_left))
    roi_h = int(max(2, roi_bottom - roi_top))
    roi = binary[roi_top:roi_top + roi_h, roi_left:roi_left + roi_w]

    cols = len(choices)
    all_ratios = []
    row_data = []

    for block in range(min(qcols, len(ranges_px))):
        rng = ranges_px[block]
        col_left = int(round(float(rng['x1']) - roi_left))
        col_right = int(round(float(rng['x2']) - roi_left))
        col_top = int(round(float(rng['y1']) - roi_top))
        col_bottom = int(round(float(rng['y2']) - roi_top))
        col_left = max(0, min(roi_w - 2, col_left))
        col_right = max(col_left + 2, min(roi_w, col_right))
        col_top = max(0, min(roi_h - 2, col_top))
        col_bottom = max(col_top + 2, min(roi_h, col_bottom))
        col_w = max(2, col_right - col_left)
        col_h = max(2, col_bottom - col_top)
        cell_w = col_w / max(1, cols)
        cell_h = col_h / max(1, rows_per_block)

        for row in range(rows_per_block):
            number = block * rows_per_block + row + 1
            if number > expected:
                break
            ratios = []
            coords = []
            for ci in range(cols):
                base_x = int(round(col_left + ci * cell_w))
                base_y = int(round(col_top + row * cell_h))
                margin_x = int(round(cell_w * CELL_MARGIN))
                margin_y = int(round(cell_h * CELL_MARGIN))
                x = base_x + margin_x
                y = base_y + margin_y
                w = max(2, int(round(cell_w - margin_x * 2)))
                h = max(2, int(round(cell_h - margin_y * 2)))
                x = max(0, min(roi_w - 2, x))
                y = max(0, min(roi_h - 2, y))
                w = max(2, min(roi_w - x, w))
                h = max(2, min(roi_h - y, h))
                cell = roi[y:y + h, x:x + w]
                filled = int(cv2.countNonZero(cell))
                ratio = filled / float(w * h)
                ratios.append(float(ratio))
                all_ratios.append(float(ratio))
                coords.append((roi_left + x + w / 2.0, roi_top + y + h / 2.0))
            row_data.append({'question': number, 'block': f'block{block+1}', 'ratios': ratios, 'coords': coords})

    # Dynamic thresholding like the reference TS implementation.
    if not all_ratios:
        return [], {}
    all_sorted = sorted(all_ratios)
    baseline_count = max(5, int(len(all_sorted) * 0.30))
    baseline_slice = all_sorted[:baseline_count]
    baseline_avg = float(np.mean(baseline_slice)) if baseline_slice else 0.0
    baseline_std = float(np.std(baseline_slice)) if baseline_slice else 0.0
    base_th = float(cfg.get('threshold', 0.22) or 0.22)
    base_delta = float(cfg.get('minFillDelta', 0.12) or 0.12)
    dynamic_th = max(base_th, baseline_avg + max(0.05, baseline_std * 2))
    dynamic_delta = max(base_delta, baseline_std * 2, 0.05)

    results = []
    per_block_answered = {'block1': 0, 'block2': 0, 'block3': 0}

    for row in row_data:
        ratios = row['ratios']
        sorted_desc = sorted(ratios, reverse=True)
        best = sorted_desc[0] if sorted_desc else 0.0
        second = sorted_desc[1] if len(sorted_desc) > 1 else 0.0
        best_idx = int(ratios.index(best)) if ratios else 0
        row_avg = float(np.mean(ratios)) if ratios else 0.0
        row_std = float(np.std(ratios)) if ratios else 0.0
        row_gate = max(dynamic_th, row_avg + max(dynamic_delta, row_std))
        is_blank = best < row_gate
        gap = best - second
        ambiguous = (not is_blank) and gap < max(dynamic_delta, row_std)
        selection_gate = max(row_gate, row_avg + max(dynamic_delta, row_std * 1.1))
        selected = [] if is_blank else [choices[i] for i, v in enumerate(ratios) if v >= selection_gate]
        selected = sorted(selected, key=lambda c: -ratios[choices.index(c)]) if selected else []
        answer = None
        status = 'BLANK'
        flags = []
        if not is_blank and not ambiguous and len(selected) == 1:
            answer = selected[0]
            status = 'OK'
        elif not is_blank and (ambiguous or len(selected) > 1):
            status = 'MULTI'
            flags.append('AMBIGUOUS' if ambiguous else 'MULTI')
        else:
            flags.append('BLANK')

        if answer:
            per_block_answered[row['block']] = per_block_answered.get(row['block'], 0) + 1
        confidence = int(max(0.0, min(1.0, (best - second) / max(best, 1e-6))) * 100)
        results.append({
            'question': row['question'],
            'answer': answer,
            'confidence': confidence,
            'scores': {choices[i]: float(round(ratios[i], 4)) for i in range(len(ratios))},
            'scores_list': [float(v) for v in ratios],
            'coords': [(int(round(x)), int(round(y))) for x, y in row['coords']],
            'best_idx': best_idx,
            'status': status,
            'flags': flags,
            'block': row['block'],
        })

    # Empty-block guard: if a non-first block has too few answers, mark as empty.
    for blk in ('block2', 'block3'):
        if per_block_answered.get(blk, 0) < 5:
            for r in results:
                if r.get('block') != blk:
                    continue
                r.update({'answer': None, 'confidence': 0, 'status': 'EMPTY_BLOCK', 'flags': ['EMPTY_BLOCK']})

    # Auto anchors (in page pixel coordinates) for UI.
    anchors = {}
    first = next((r for r in results if r.get('question') == 1), None)
    if first and first.get('coords'):
        coords = first['coords']
        if len(coords) >= 2:
            anchors['q1A'] = [float(coords[0][0]), float(coords[0][1])]
            anchors['q1E'] = [float(coords[-1][0]), float(coords[-1][1])]
    q53 = next((r for r in results if r.get('question') == 53), None)
    if q53 and q53.get('coords'):
        anchors['q53A'] = [float(q53['coords'][0][0]), float(q53['coords'][0][1])]

    return results, {'anchors': anchors, 'dynamic': {'threshold': dynamic_th, 'delta': dynamic_delta}}

def ring_ink_ratio(binary, x, y, r):
    h, w = binary.shape[:2]
    x = float(x); y = float(y); r = float(r)
    r1 = max(2.0, r * 0.95)
    r2 = max(r1 + 1.0, r * 1.35)
    mg = int(r2) + 2
    x1, x2 = max(0, int(x - mg)), min(w, int(x + mg))
    y1, y2 = max(0, int(y - mg)), min(h, int(y + mg))
    if x2 <= x1 or y2 <= y1:
        return 0.0
    yy, xx = np.ogrid[y1:y2, x1:x2]
    dsq = (xx - x) ** 2 + (yy - y) ** 2
    mask = (dsq >= r1 ** 2) & (dsq <= r2 ** 2)
    roi = binary[y1:y2, x1:x2]
    vals = roi[mask]
    if vals.size < 10:
        return 0.0
    return float(np.count_nonzero(vals)) / float(vals.size)

def complete_x_centers(xct, binary, yct, r, pw, prefer_side=None):
    xct = sorted([float(x) for x in xct])
    if len(xct) >= CHOICES_PER_ROW:
        return xct[:CHOICES_PER_ROW]
    if len(xct) < 2:
        if len(xct) == 1:
            sp = max(30.0, r * 2.8)
            start = xct[0] - sp * 2
            return [start + i * sp for i in range(CHOICES_PER_ROW)]
        return [pw * 0.55 + i * 30 for i in range(CHOICES_PER_ROW)]

    sp = float(np.median(np.diff(xct)))
    sp = max(sp, r * 2.2, 24.0)
    # Candidate: prepend vs append when exactly one missing.
    if len(xct) == CHOICES_PER_ROW - 1:
        left_candidate = [xct[0] - sp] + xct
        right_candidate = xct + [xct[-1] + sp]

        if prefer_side == "left":
            return left_candidate
        if prefer_side == "right":
            return right_candidate

        candidates = [left_candidate, right_candidate]

        def score(candidate):
            if binary is None or not yct:
                return 0.0
            ys = [float(y) for y in yct[:min(12, len(yct))]]
            total = 0.0
            for y in ys:
                for x in candidate:
                    total += ring_ink_ratio(binary, x, y, r)
            return total

        scored = [(score(c), c) for c in candidates]
        scored.sort(key=lambda t: t[0], reverse=True)
        # If scoring is inconclusive, bias to left (block1 tends to miss the leftmost column).
        if len(scored) >= 2 and abs(scored[0][0] - scored[1][0]) < 1e-3:
            return left_candidate
        return scored[0][1]

    # Fallback: grow outwards using spacing.
    while len(xct) < CHOICES_PER_ROW:
        # Alternate left/right expansion.
        left = xct[0] - sp
        right = xct[-1] + sp
        if left > 0:
            xct = [left] + xct
        if len(xct) < CHOICES_PER_ROW and right < pw:
            xct = xct + [right]
        if left <= 0 and right >= pw:
            break
    return xct[:CHOICES_PER_ROW]

def split_into_blocks(cir, pw):
    if not cir: return []
    xv = [c[0] for c in cir]; sx = np.sort(xv); n = len(sx)
    if n < 30: return []
    xc = [np.median(sx[:n//3]), np.median(sx[n//3:2*n//3]), np.median(sx[2*n//3:])]
    blks = [[],[],[]]
    for c in cir: blks[np.argmin([abs(c[0]-xc[i]) for i in range(3)])].append(c)
    res = []
    for i,bc in enumerate(blks):
        if len(bc) < 10: continue
        xs,ys = [c[0] for c in bc], [c[1] for c in bc]
        res.append({'name':f'block{i+1}','q_start':1+i*ROWS_PER_BLOCK,'q_end':(i+1)*ROWS_PER_BLOCK,'circles':bc,'x_min':min(xs),'x_max':max(xs),'y_min':min(ys),'y_max':max(ys)})
    res.sort(key=lambda b: np.mean([c[0] for c in b['circles']]))
    for i,b in enumerate(res): b['name'], b['q_start'], b['q_end'] = f'block{i+1}', 1+i*ROWS_PER_BLOCK, (i+1)*ROWS_PER_BLOCK
    return res

def infer_auto_anchors(blocks):
    # Backwards compatible shim: keep signature, but prefer grid-derived anchors when possible.
    return {}

def infer_auto_anchors_from_grid(blocks, binary, pw):
    """
    Improved auto-anchor detection with stricter validation.
    Returns anchor points (q1A, q1E, q53A) only if we have high confidence.
    """
    anchors = {}
    ph = binary.shape[0] if binary is not None else DEFAULT_PAGE_H
    
    for blk in blocks:
        cir = blk.get('circles', [])
        if len(cir) < 50:  # Need enough circles for reliable detection
            continue
            
        # Get median radius for clustering
        radii = [c[2] for c in cir]
        mr = float(np.median(radii)) if radii else 10.0
        
        # Cluster x-coordinates (columns/choices)
        xv = [c[0] for c in cir]
        xcl = sorted(cluster_1d(xv, mr * 1.5))
        
        # Cluster y-coordinates (rows/questions)
        yv = [c[1] for c in cir]
        ycl = sorted(cluster_1d(yv, mr * 1.2))
        
        # Validate: need exactly 5 x-clusters (A,B,C,D,E) and many y-clusters (rows)
        if len(xcl) < CHOICES_PER_ROW:
            # Try to complete x-centers
            x_center = (float(blk.get('x_min', 0)) + float(blk.get('x_max', pw))) / 2.0
            prefer = "left" if x_center < pw * 0.68 else "right"
            xcl = complete_x_centers(xcl, binary, ycl, mr, pw, prefer_side=prefer)
        
        if len(xcl) < CHOICES_PER_ROW or len(ycl) < 10:
            continue
        
        # Validate spacing consistency (should be roughly uniform)
        x_diffs = np.diff(xcl[:CHOICES_PER_ROW])
        y_diffs = np.diff(ycl[:min(20, len(ycl))])
        
        if len(x_diffs) > 0 and len(y_diffs) > 0:
            x_std = float(np.std(x_diffs))
            y_std = float(np.std(y_diffs))
            x_mean = float(np.mean(x_diffs))
            y_mean = float(np.mean(y_diffs))
            
            # Spacing should be consistent (std < 30% of mean)
            x_consistent = x_std < x_mean * 0.30 if x_mean > 0 else False
            y_consistent = y_std < y_mean * 0.30 if y_mean > 0 else False
            
            if not (x_consistent and y_consistent):
                continue
        
        # Find the first row (topmost y-cluster that has circles near all 5 x positions)
        first_row_y = None
        for y_candidate in ycl[:5]:  # Check first 5 rows
            # Count how many x-clusters have a circle near this y
            x_hits = 0
            for xc in xcl[:CHOICES_PER_ROW]:
                for cx, cy, cr in cir:
                    if abs(cx - xc) < mr * 1.5 and abs(cy - y_candidate) < mr * 1.5:
                        x_hits += 1
                        break
            if x_hits >= CHOICES_PER_ROW - 1:  # Allow 1 missing
                first_row_y = y_candidate
                break
        
        if first_row_y is None:
            first_row_y = ycl[0]  # Fallback to first cluster
        
        # Set anchors
        xct = xcl[:CHOICES_PER_ROW]
        if blk.get('name') == 'block1':
            anchors['q1A'] = [float(xct[0]), float(first_row_y)]
            anchors['q1E'] = [float(xct[CHOICES_PER_ROW - 1]), float(first_row_y)]
        if blk.get('name') == 'block2':
            anchors['q53A'] = [float(xct[0]), float(first_row_y)]
    
    return anchors

def build_grid_fixed_rows(blk, er=ROWS_PER_BLOCK, dr=10, anchor=None, binary=None, pw=DEFAULT_PAGE_W):
    # Anchor-based override
    if anchor:
        q1a = anchor.get('q1A')
        q1e = anchor.get('q1E')
        q53a = anchor.get('q53A')
        if q1a and q1e:
            cir = blk.get('circles', [])
            rad = float(np.median([c[2] for c in cir])) if cir else float(dr)
            ax, ay = float(q1a[0]), float(q1a[1])
            ex = float(q1e[0])
            xct = [ax + i * (ex - ax) / (CHOICES_PER_ROW - 1) for i in range(CHOICES_PER_ROW)]
            # Prefer y-clusters from detected circles to avoid drift; fallback to linear.
            yvals = [c[1] for c in cir]
            yct = None
            if yvals:
                ycl = sorted(cluster_1d(yvals, max(rad * 1.2, 10.0)))
                if len(ycl) >= max(8, er - 6):
                    # Align: use the cluster nearest to ay as row-1.
                    idx0 = int(np.argmin([abs(y - ay) for y in ycl]))
                    ycl = ycl[idx0:] if len(ycl) - idx0 >= er else ycl
                    if len(ycl) >= er:
                        yct = [float(y) for y in ycl[:er]]
            if not yct:
                ymax = float(max(yvals)) if yvals else ay + (er - 1) * (rad * 3.2)
                step = (ymax - ay) / max(1, (er - 1))
                yct = [ay + i * step for i in range(er)]
            # If q53A exists and this is block2+, shift x centers accordingly
            if q53a and blk.get('q_start', 1) > ROWS_PER_BLOCK:
                dx = float(q53a[0]) - ax
                xct = [x + dx for x in xct]
            return {'x_centers':xct, 'y_centers':yct, 'radius':rad, 'anchor_used': True}
    cir = blk.get('circles',[])
    if not cir: return None
    rad = [c[2] for c in cir]; mr = np.median(rad) if rad else dr
    xv = [c[0] for c in cir]; xt = mr*1.5; xcl = cluster_1d(xv, xt)
    cs = [(xc, sum(1 for c in cir if abs(c[0]-xc)<xt)) for xc in xcl]
    cs.sort(key=lambda x:x[1], reverse=True); xct = sorted([c[0] for c in cs[:CHOICES_PER_ROW]])
    if len(xct) < CHOICES_PER_ROW:
        yv = [c[1] for c in cir]
        ycl = sorted(cluster_1d(yv, mr*1.2))
        x_center = (float(blk.get('x_min', 0)) + float(blk.get('x_max', pw))) / 2.0
        prefer = "left" if x_center < pw * 0.68 else "right"
        xct = complete_x_centers(xct, binary, ycl, mr, pw, prefer_side=prefer)
    yv = [c[1] for c in cir]; yt = mr*1.2; ycl = cluster_1d(yv, yt)
    if len(ycl) >= 2:
        yt, yb = min(ycl), max(ycl)
        if len(ycl) > 5: es = np.median(np.diff(sorted(ycl)))
        else: es = (yb-yt)/(er-1)
        exp = np.clip(2*es, 30, 90); yt = max(0, yt-exp)
        st = (yb-yt)/(er-1) if er>1 else 0; yct = [yt+i*st for i in range(er)]
    else:
        yt,yb = blk['y_min'], blk['y_max']; st = (yb-yt)/(er-1) if er>1 else 0; yct = [yt+i*st for i in range(er)]
    return {'x_centers':xct, 'y_centers':yct, 'radius':mr, 'anchor_used': False}

def score_bubble(gray, x, y, r):
    h,w = gray.shape; r1,r2 = int(0.35*r), int(0.85*r); rb1,rb2 = int(1.05*r), int(1.35*r)
    mg = rb2+2; x1,x2 = max(0,int(x-mg)), min(w,int(x+mg)); y1,y2 = max(0,int(y-mg)), min(h,int(y+mg))
    if x2<=x1 or y2<=y1: return 0.0
    yy,xx = np.ogrid[y1:y2, x1:x2]; dsq = (xx-x)**2 + (yy-y)**2
    fm = (dsq >= r1**2) & (dsq <= r2**2); bm = (dsq >= rb1**2) & (dsq <= rb2**2)
    roi = gray[y1:y2, x1:x2]; fp, bp = roi[fm], roi[bm]
    if len(fp)==0 or len(bp)==0: return 0.0
    return max(0.0, (np.mean(bp)-np.mean(fp))/255.0)

def compute_ink_ratio(gray, x, y, r):
    h,w = gray.shape; r1,r2 = int(0.28*r), int(0.75*r); rb1,rb2 = int(1.05*r), int(1.35*r)
    mg = rb2+2; x1,x2 = max(0,int(x-mg)), min(w,int(x+mg)); y1,y2 = max(0,int(y-mg)), min(h,int(y+mg))
    if x2<=x1 or y2<=y1: return 0.0
    yy,xx = np.ogrid[y1:y2, x1:x2]; dsq = (xx-x)**2 + (yy-y)**2
    fm = (dsq >= r1**2) & (dsq <= r2**2); bm = (dsq >= rb1**2) & (dsq <= rb2**2)
    roi = gray[y1:y2, x1:x2]; bp = roi[bm]
    if len(bp)<10: return 0.0
    bm_val = np.mean(bp); bs = np.std(bp)+1e-6; ith = bm_val - 1.0*bs
    fp = roi[fm]
    if len(fp)==0: return 0.0
    return np.sum(fp < ith)/len(fp)

def compute_noise_at_midpoint(gray, x, y, r):
    h,w = gray.shape; ri = int(0.22*r); rr1,rr2 = int(0.95*r), int(1.20*r)
    mg = rr2+2; x1,x2 = max(0,int(x-mg)), min(w,int(x+mg)); y1,y2 = max(0,int(y-mg)), min(h,int(y+mg))
    if x2<=x1 or y2<=y1: return 0.0
    yy,xx = np.ogrid[y1:y2,x1:x2]; dsq = (xx-x)**2 + (yy-y)**2
    im = dsq <= ri**2; rm = (dsq >= rr1**2) & (dsq <= rr2**2)
    roi = gray[y1:y2,x1:x2]; bgm = dsq >= rr2**2; bgp = roi[bgm]
    bgmn = np.mean(bgp) if len(bgp)>=10 else 200
    ip = roi[im]; isc = max(0,(bgmn-np.mean(ip))/255.0) if len(ip)>0 else 0
    rp = roi[rm]; rsc = max(0,(bgmn-np.mean(rp))/255.0) if len(rp)>0 else 0
    return max(isc, rsc)

def compute_noise_max(gray, coords, r):
    if len(coords)<2: return 0.0
    ns = []; y = coords[0][1]
    for i in range(len(coords)-1):
        mx = (coords[i][0]+coords[i+1][0])/2
        ns.append(compute_noise_at_midpoint(gray, mx, y, r))
    return max(ns) if ns else 0.0

def is_strong_override(best, delta, z, mth, margin):
    return best >= mth+0.04 and delta >= 3.5*margin and z >= 2.6

def is_signal_strong_enough(z, delta, margin):
    return z >= 2.5 or delta >= 3.2*margin

def stability_check_soft(gray, coords, bidx, r, dy0=0):
    if bidx >= len(coords): return False, []
    dyo = [dy0, dy0+2, dy0-2]; votes = []
    for dy in dyo:
        sc = [score_bubble(gray, cx, cy+dy, r) for cx,cy in coords]
        if sc: votes.append(int(np.argmax(sc)))
    if not votes: return False, votes
    from collections import Counter
    vc = Counter(votes); mc, mcnt = vc.most_common(1)[0]
    return mcnt >= 2, votes

def find_best_dy_offset(gray, xc, yc, r, nr=TOP_ROWS_COUNT):
    bdy, bsum = 0, -1
    for dy in DY_CANDIDATES:
        tot = 0
        for ri in range(min(nr, len(yc))):
            y = yc[ri]+dy; sc = [score_bubble(gray, int(x), int(y), r) for x in xc]
            tot += max(sc) if sc else 0
        if tot > bsum: bsum, bdy = tot, dy
    return (0, bsum) if bsum < TOP_ROWS_MIN_SUM else (bdy, bsum)

def process_block(gray, blk, grid, choices, th, is_block1=False):
    if grid is None: return [], {}
    xc, yc, r = grid['x_centers'], grid['y_centers'], grid['radius']
    qs = blk['q_start']; mth = th.get('mark_th', MARK_TH_FLOOR)
    bth = th.get('blank_th', 0.05); margin = th.get('margin', MARGIN_TH_FLOOR)
    rows = []; dyo, dys = (find_best_dy_offset(gray, xc, yc, r, TOP_ROWS_COUNT) if is_block1 else (0, 0))
    for ri, yb in enumerate(yc):
        y = yb + dyo if is_block1 and ri < TOP_ROWS_COUNT else yb
        scores, coords = [], []
        for ci, x in enumerate(xc):
            if ci >= len(choices): break
            scores.append(round(score_bubble(gray, int(x), int(y), r), 4))
            coords.append((int(x), int(y)))
        sa = np.array(scores)
        if len(sa) > 0:
            bidx = int(np.argmax(sa)); best = sa[bidx]
            ss = np.sort(sa)[::-1]; sec = ss[1] if len(ss)>1 else 0
            med = float(np.median(sa)); std = float(np.std(sa))+1e-6
            z = (best-med)/std; delta = best-sec
        else:
            bidx, best, sec, med, std, z, delta = 0, 0, 0, 0, 1e-6, 0, 0
        nm = compute_noise_max(gray, coords, r); ng = best - nm
        ink = compute_ink_ratio(gray, coords[bidx][0], coords[bidx][1], r) if bidx < len(coords) else 0.0
        rows.append({'question':qs+ri, 'row_idx':ri, 'scores':{choices[i]:scores[i] for i in range(len(scores))},
            'scores_list':scores, 'coords':coords, 'best':float(best), 'second':float(sec), 'best_idx':bidx,
            'best_choice':choices[bidx] if bidx<len(choices) else None, 'delta':float(delta), 'row_median':med,
            'row_std':std, 'z':float(z), 'block':blk['name'], 'radius':r, 'mark_th':mth, 'blank_th':bth,
            'margin':margin, 'noise_max':round(nm,4), 'noise_gap':round(ng,4), 'ink_ratio':round(ink,4),
            'rescued':False, 'rescue_params':None, 'tags':[], 'veto_reason':None, 'signal_strong_enough':False, 'noise_margin':0})
    return rows, {'dy_offset':dyo, 'dy_sum':dys}

def compute_thresholds(rows):
    if FAINT_MODE:
        # Force permissive thresholds for low-ink scans
        return {'mark_th': MARK_TH_FLOOR, 'blank_th': 0.02, 'margin': max(MARGIN_TH_FLOOR, 0.006)}
    if not rows: return {'mark_th':MARK_TH_FLOOR,'blank_th':0.05,'margin':MARGIN_TH_FLOOR}
    bs = [r['best'] for r in rows]; ds = [r['delta'] for r in rows]
    su8 = (np.clip(np.array(bs),0,1)*255).astype(np.uint8)
    oth,_ = cv2.threshold(su8,0,255,cv2.THRESH_BINARY+cv2.THRESH_OTSU)
    mth = min(max(oth/255.0, MARK_TH_FLOOR), 0.18)
    bth = max(mth*0.45, 0.025)
    margin = min(max(np.percentile(ds,15) if len(ds)>5 else 0.018, MARGIN_TH_FLOOR), 0.08)
    return {'mark_th':round(mth,4),'blank_th':round(bth,4),'margin':round(margin,4)}

def calibrate_ink_threshold(rows, mth, margin):
    ss = [r['ink_ratio'] for r in rows if r['best']>=mth+0.03 and r['delta']>=2.5*margin]
    return float(np.median(ss)) if len(ss)>=3 else None

def apply_decisions(gray, rows, th, faint_ok, is_empty, bmi, choices, allow_faint_force=False):
    mth, bth, margin = th['mark_th'], th['blank_th'], th['margin']
    fm = max(1.5*margin, 0.02); nm = max(0.006, 0.25*margin)
    for r in rows:
        r['noise_margin'] = round(nm,4)
        if is_empty:
            r['answer'], r['confidence'], r['status'], r['flags'], r['tier'], r['veto_reason'] = None, 0, 'EMPTY_BLOCK', ['EMPTY_BLOCK'], 'EMPTY_BLOCK', None
            continue
        best, delta, z, bc, bidx, coords, rad = r['best'], r['delta'], r['z'], r['best_choice'], r['best_idx'], r['coords'], r.get('radius',10)
        ng, ink = r['noise_gap'], r['ink_ratio']
        tier, ws, vr = 'BLANK', False, None
        if best >= mth and delta >= margin and z >= Z_TH_OK: ws, tier = True, 'OK'
        elif FAINT_MODE and faint_ok and best >= bth and delta >= fm and z >= Z_TH_FAINT: ws, tier = True, 'FAINT_OK'
        elif best >= bth and delta < margin: tier, vr = 'MULTI', 'BELOW_THRESH'
        elif best >= bth and z < Z_TH_OK: tier, vr = 'LOW_CONF', 'BELOW_THRESH'
        else: vr = 'BELOW_THRESH'
        so = is_strong_override(best, delta, z, mth, margin); ss = is_signal_strong_enough(z, delta, margin); r['signal_strong_enough'] = ss
        sp, sv = True, []
        if ws:
            sp, sv = stability_check_soft(gray, coords, bidx, rad)
            if not sp:
                if so or (best >= mth+2*margin and delta >= 3*margin): sp, tier = True, 'OK_STAB_OVERRIDE' if tier=='OK' else tier
                else: sp, tier, ws, vr = False, 'STABILITY_FAIL', False, 'STAB_FAIL'
        nv = False
        if ws and not so and not ss and ng < nm: nv, tier, ws, vr = True, 'NV', False, 'NV'; r['tags'].append('NV')
        if ws and ss and ng < nm: r['tags'].append('NV*')
        if ws and bmi is not None and not so:
            ith = max(0.004, 0.35*bmi)
            if ink < ith: tier, ws, vr = 'INK_REL_FAIL', False, 'INK_REL_FAIL'; r['tags'].append('INK_REL_FAIL')
        if ws and tier in ('OK','OK_STAB_OVERRIDE','FAINT_OK'):
            r['answer'], r['confidence'], r['status'], r['flags'], vr = bc, min(100,int((delta/max(best,1e-6))*100)), tier, ['FAINT_OK'] if tier=='FAINT_OK' else [], None
        elif tier in ('NV','INK_REL_FAIL'): r['answer'], r['confidence'], r['status'], r['flags'] = None, int((delta/max(best,1e-6))*100), tier, [tier]
        elif tier == 'STABILITY_FAIL': r['answer'], r['confidence'], r['status'], r['flags'] = None, int((delta/max(best,1e-6))*100), 'STABILITY_FAIL', ['STABILITY_FAIL']
        elif tier == 'MULTI': r['answer'], r['confidence'], r['status'], r['flags'] = None if STRICT else bc, int((delta/max(best,1e-6))*100), 'MULTI', ['MULTI_MARK']
        elif tier == 'LOW_CONF': r['answer'], r['confidence'], r['status'], r['flags'] = None if STRICT else bc, int((delta/max(best,1e-6))*100), 'LOW_CONF', ['LOW_CONFIDENCE']
        else: r['answer'], r['confidence'], r['status'], r['flags'] = None, 0, 'BLANK', ['BLANK']
        r['tier'], r['veto_reason'] = tier, vr
        # DISABLED: FAINT_FORCED causes false positives
        # if allow_faint_force and FAINT_MODE and r['answer'] is None:
        #     faint_best_ok = best >= mth * 0.70
        #     faint_delta_ok = delta >= margin * 0.80
        #     faint_z_ok = z >= 1.0
        #     if faint_best_ok and faint_delta_ok and faint_z_ok:
        #         r['answer'] = bc
        #         r['confidence'] = int((delta/max(best,1e-6))*100)
        #         r['status'] = 'FAINT_FORCED'
        #         r['flags'] = ['FORCED_FAINT']
    return rows

def targeted_rescue(gray, row, th, bmi, choices):
    coords, rad = row['coords'], row.get('radius',10); br, bo = None, -999
    for rs in RESCUE_R_SCALES:
        rt = rad*rs
        for dx in RESCUE_DX:
            for dy in RESCUE_DY:
                nc = [(int(cx+dx), int(cy+dy)) for cx,cy in coords]
                ns = [score_bubble(gray, cx, cy, rt) for cx,cy in nc]
                if not ns: continue
                sa = np.array(ns); bidx = int(np.argmax(sa)); best = sa[bidx]
                ss = np.sort(sa)[::-1]; sec = ss[1] if len(ss)>1 else 0; delta = best-sec
                med, std = float(np.median(sa)), float(np.std(sa))+1e-6; z = (best-med)/std
                nmx = compute_noise_max(gray, nc, rt); ng = best-nmx
                obj = delta + 0.25*z + 0.10*ng
                if obj > bo:
                    bo = obj; br = {'dx':dx,'dy':dy,'r_scale':rs,'coords':nc,'best_idx':bidx,'best':float(best),'second':float(sec),'delta':float(delta),'z':float(z),'noise_max':float(nmx),'noise_gap':float(ng),'objective':float(obj),'best_choice':choices[bidx] if bidx<len(choices) else None}
    return br

def apply_rescue_pass(gray, rows, th, is_empty, bmi, choices):
    if is_empty: return rows
    mth, bth, margin = th['mark_th'], th['blank_th'], th['margin']; nm = max(0.008, 0.24*margin)
    for r in rows:
        if r.get('answer') is not None or r.get('status')=='MULTI': continue
        best, delta, rad = r['best'], r['delta'], r.get('radius',10)
        if not (best >= bth*0.90 or delta >= 1.5*margin): continue
        rr = targeted_rescue(gray, r, th, bmi, choices)
        if rr is None: continue
        nb, nd, nz, nc, nbi, nch, nng = rr['best'], rr['delta'], rr['z'], rr['coords'], rr['best_idx'], rr['best_choice'], rr['noise_gap']
        nink = compute_ink_ratio(gray, nc[nbi][0], nc[nbi][1], rad*rr['r_scale']) if nbi<len(nc) else 0
        so = is_strong_override(nb, nd, nz, mth, margin)
        sta, _ = stability_check_soft(gray, nc, nbi, rad)
        accept = False
        if nb >= bth and nd >= 1.6*margin and nz >= 1.8:
            if nng >= nm or so:
                if bmi is None or nink >= max(0.004, 0.35*bmi) or so:
                    if sta or so: accept = True
        if not accept: r['tags'].append('CAND'); continue
        r.update({'answer':nch,'best':nb,'second':rr['second'],'delta':nd,'z':nz,'best_idx':nbi,'best_choice':nch,'noise_max':rr['noise_max'],'noise_gap':nng,'ink_ratio':round(nink,4),'confidence':min(100,int((nd/max(nb,1e-6))*100)),'status':'RESCUED','tier':'RESCUED','flags':['RESCUED'],'rescued':True,'rescue_params':{'dx':rr['dx'],'dy':rr['dy'],'r_scale':rr['r_scale'],'objective':rr['objective'],'stable':sta,'override':so},'veto_reason':None})
        r['tags'].append('RESCUE')
    return rows

def apply_near_miss_rescue(gray, gcl, rows, th, is_empty, bmi, choices):
    if is_empty: return rows
    mth, bth, margin = th['mark_th'], th['blank_th'], th['margin']; rnm = max(0.015, 0.38*margin)
    for r in rows:
        if r.get('answer') is not None: continue
        vr = r.get('veto_reason')
        if vr not in ('BELOW_THRESH','INK_REL_FAIL','NV',None): continue
        best, delta, z, coords, rad, bidx = r['best'], r['delta'], r['z'], r['coords'], r.get('radius',10), r['best_idx']
        ss = r.get('signal_strong_enough', False)
        gs = [score_bubble(gray, cx, cy, rad) for cx,cy in coords]
        cs = [score_bubble(gcl, cx, cy, rad) for cx,cy in coords] if gcl is not None else gs
        cg, cc = choices[int(np.argmax(gs))] if gs else None, choices[int(np.argmax(cs))] if cs else None
        bg, bc = max(gs) if gs else 0, max(cs) if cs else 0
        r['best_gray'], r['best_clahe'], r['choice_gray'], r['choice_clahe'] = round(bg,4), round(bc,4), cg, cc
        ga = ss; gb = z >= 2.3 and delta >= 2.4*margin; ctm = best >= mth-0.02
        if not (ga or gb) or not ctm or best < bth: continue
        if vr == 'NV' and not ss: r['tags'].append('CAND_FAIL(NV)'); continue
        if cg != cc: r['tags'].append('CLAHE_FLIP'); r['veto_reason'] = 'CLAHE_FLIP'; continue
        nmx = compute_noise_max(gray, coords, rad); ng = best - nmx
        vs = z >= 3.0 and delta >= 3.5*margin
        if ng < rnm and not vs: r['tags'].append('NV_RESCUE_FAIL'); r['veto_reason'] = 'NV_RESCUE'; continue
        sta, _ = stability_check_soft(gray, coords, bidx, rad)
        if not sta: r['tags'].append('CAND_FAIL(STAB)'); continue
        r.update({'answer':r['best_choice'],'confidence':min(100,int((delta/max(best,1e-6))*100)),'status':'NEAR_MISS_OK','tier':'NEAR_MISS_OK','flags':['NEAR_MISS_OK'],'veto_reason':None,'clahe_used':False,'clahe_enabled':bg>=mth-0.015})
        r['tags'].append('NEAR_MISS_OK')
    return rows

def create_preview(wp, blks, rows, choices, aths, eblks, dd=None):
    pv = cv2.cvtColor(wp, cv2.COLOR_GRAY2BGR) if len(wp.shape)==2 else wp.copy()
    cols = [(255,0,255),(0,255,255),(255,255,0)]
    for i,b in enumerate(blks):
        cv2.rectangle(pv, (int(b['x_min']-20),int(b['y_min']-20)), (int(b['x_max']+20),int(b['y_max']+20)), cols[i%3], 2)
    for r in rows:
        coords, ch, st = r.get('coords',[]), r.get('answer'), r.get('status','BLANK')
        res = r.get('rescued', False)
        for i,(cx,cy) in enumerate(coords):
            c = choices[i] if i<len(choices) else '?'
            if ch == c:
                cl = (200,200,0) if res else ((0,255,0) if st in ('OK','OK_STAB_OVERRIDE') else ((0,165,255) if st=='FAINT_OK' else (0,255,255)))
                th = 3
            elif st in ('NV','INK_REL_FAIL') and i==r.get('best_idx',-1): cl, th = (0,0,255), 2
            else: cl, th = (128,128,128), 1
            cv2.circle(pv, (int(cx),int(cy)), 10, cl, th)
    if dd: cv2.imwrite(os.path.join(dd,'06_preview.png'), pv)
    return pv

def process(inp, tmpl, outd):
    st = time.time()
    try: template = json.loads(tmpl)
    except: 
        with open(tmpl,'r',encoding='utf-8') as f: template = json.load(f)
    cfg = template.get('config', template); tk = template.get('key','unknown')
    pw = cfg.get('page',{}).get('width', DEFAULT_PAGE_W); ph = cfg.get('page',{}).get('height', DEFAULT_PAGE_H)
    choices = cfg.get('choices', ['A','B','C','D','E'])
    dd = os.path.join(outd,'debug') if DEBUG else None
    if dd: os.makedirs(dd, exist_ok=True)
    meta = {'templateKey':tk,'expectedQuestionCount':EXPECTED_QUESTION_COUNT,'pageSize':[pw,ph],'strictMode':STRICT,'version':'v22'}
    warnings = []
    img = load_image(inp)
    override_corners = None
    if OVERRIDE_CORNERS:
        try:
            override_corners = json.loads(OVERRIDE_CORNERS)
        except Exception as e:
            warnings.append(f"corner_parse_fail:{e}")
    anchors = None
    if ANCHORS:
        try:
            anchors = normalize_anchor_payload(json.loads(ANCHORS), pw, ph)
        except Exception as e:
            warnings.append(f"anchor_parse_fail:{e}")

    if override_corners:
        wf, cok, warn = apply_override_corners(img, pw, ph, override_corners, dd)
        wr = wf
    else:
        wr, _ = rough_page_warp(img, pw, ph, dd)
        wf, cok, warn = fine_warp_with_corners(wr, pw, ph, dd)
    meta['cornerMarkersFound'] = cok
    if warn: warnings.append(warn)
    gray = cv2.cvtColor(wf, cv2.COLOR_BGR2GRAY) if len(wf.shape)==3 else wf
    binary = build_binary(gray)
    # Persist warped image for UI preview (no overlays)
    try:
        cv2.imwrite(os.path.join(outd, 'warped.png'), wf)
    except Exception:
        pass
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)); gcl = clahe.apply(gray)
    # Optional grid-based reading (off by default). Circle/anchor model is the primary path.
    use_grid = USE_GRID
    cir = detect_circles(gray, dd); meta['totalCircles'] = len(cir)
    acir = isolate_answer_circles(cir, pw, ph); blks = split_into_blocks(acir, pw); meta['blocksDetected'] = len(blks)
    if PREVIEW_ONLY:
        if use_grid:
            grid_rows, grid_meta = read_grid_answers(binary, cfg, pw, ph, choices, blocks=blks)
            auto_anchors = grid_meta.get('anchors', {})
        else:
            auto_anchors = infer_auto_anchors_from_grid(blks, binary, pw)
        res = {
            'templateKey': tk,
            'answers': [],
            'summary': {'total': 0, 'answered': 0, 'ok': 0},
            'meta': meta,
            'anchors': anchors or auto_anchors
        }
        rp = os.path.join(outd, 'result.json')
        with open(rp,'w',encoding='utf-8') as f: json.dump(res, f, indent=2, ensure_ascii=False)
        # Also provide a minimal preview overlay if debug enabled
        if DEBUG:
            pv = create_preview(wf, blks, [], choices, {}, set(), dd)
            pvp = os.path.join(outd, 'preview.png'); cv2.imwrite(pvp, pv)
        else:
            pvp = os.path.join(outd, 'preview.png')
            cv2.imwrite(pvp, wf)
        return {'success':True,'resultPath':rp,'previewPath':pvp}
    if use_grid:
        rows, grid_meta = read_grid_answers(binary, cfg, pw, ph, choices, blocks=blks)
        arows = rows
        aths, eblks = {}, set()
        auto_anchors = grid_meta.get('anchors', {})
        pv = create_preview(wf, blks, arows, choices, aths, eblks, dd)
        pvp = os.path.join(outd,'preview.png'); cv2.imwrite(pvp, pv)
        ok = sum(1 for r in arows if r.get('status','').startswith('OK'))
        ans = sum(1 for r in arows if r.get('answer'))
        # Normalize to existing API schema.
        ex = {r['question'] for r in arows}
        for q in range(1, EXPECTED_QUESTION_COUNT+1):
            if q not in ex:
                arows.append({
                    'question': q,
                    'answer': None,
                    'confidence': 0,
                    'scores': {},
                    'flags': ['BLANK', 'NOT_DETECTED'],
                    'status': 'NOT_DETECTED',
                    'block': 'unknown',
                    'tier': 'NOT_DETECTED',
                    'tags': [],
                    'veto_reason': None,
                    'coords': [],
                    'best_idx': 0,
                    'scores_list': [],
                    'best': 0.0,
                    'delta': 0.0,
                    'z': 0.0,
                    'noise_gap': 0.0,
                    'ink_ratio': 0.0
                })
        arows.sort(key=lambda r:r['question'])
        if MAX_QUESTIONS > 0:
            arows = arows[:MAX_QUESTIONS]
        else:
            arows = arows[: (EXPECTED_QUESTION_COUNT if not LIMIT_FIRST_BLOCK else ROWS_PER_BLOCK)]
        res = {
            'templateKey': tk,
            'answers': [{
                'question': r['question'],
                'answer': r.get('answer'),
                'confidence': r.get('confidence', 0),
                'scores': r.get('scores', {}),
                'flags': r.get('flags', []),
                'block': r.get('block'),
                'status': r.get('status'),
                'best': float(r.get('best', 0.0) or 0.0),
                'delta': float(r.get('delta', 0.0) or 0.0),
                'z': float(r.get('z', 0.0) or 0.0),
                'noise_gap': float(r.get('noise_gap', 0.0) or 0.0),
                'ink_ratio': float(r.get('ink_ratio', 0.0) or 0.0),
                'tier': r.get('tier'),
                'veto_reason': r.get('veto_reason'),
                'tags': r.get('tags', [])
            } for r in arows],
            'summary': {'total': len(arows), 'answered': ans, 'ok': ok},
            'meta': meta,
            'anchors': anchors or auto_anchors
        }
        rp = os.path.join(outd,'result.json')
        with open(rp,'w',encoding='utf-8') as f: json.dump(res, f, indent=2, ensure_ascii=False)
        return {'success':True,'resultPath':rp,'previewPath':pvp}

    arows, aths, eblks = [], {}, set()
    auto_anchors = {}
    # Pre-compute auto anchors from detected circles (used as fallback when manual anchors are not provided).
    auto_anchors = infer_auto_anchors_from_grid(blks, binary, pw)
    for blk in blks:
        ib1 = blk['name']=='block1'
        # Pass anchor data to grid builder
        akey = anchors or auto_anchors
        grid = build_grid_fixed_rows(blk, ROWS_PER_BLOCK, anchor=akey, binary=binary, pw=pw)
        ith = {'mark_th':MARK_TH_FLOOR,'blank_th':0.05,'margin':MARGIN_TH_FLOOR}
        rows, ri = process_block(gray, blk, grid, choices, ith, ib1)
        th = compute_thresholds(rows); th.update(ri)
        for r in rows: r['mark_th'], r['blank_th'], r['margin'] = th['mark_th'], th['blank_th'], th['margin']
        rows, ri = process_block(gray, blk, grid, choices, th, ib1)
        sc = sum(1 for r in rows if r['best']>=th['mark_th'] and r['delta']>=th['margin'] and r['z']>=Z_TH_OK)
        fe = sc >= MIN_STRONG_MARKS_FOR_FAINT; ie = sc < MIN_STRONG_FOR_EMPTY_BLOCK
        if ie: eblks.add(blk['name'])
        bmi = calibrate_ink_threshold(rows, th['mark_th'], th['margin']) if not ie else None
        th.update({'strong_count':sc,'faint_enabled':fe,'is_empty':ie,'median_ink':bmi}); aths[blk['name']] = th
        rows = apply_decisions(gray, rows, th, fe, ie, bmi, choices, allow_faint_force=ib1)
        # DISABLED: Rescue passes cause too many false positives
        # rows = apply_rescue_pass(gray, rows, th, ie, bmi, choices)
        # rows = apply_near_miss_rescue(gray, gcl, rows, th, ie, bmi, choices)
        # If non-first block and very few answers found, treat entire block as empty to avoid noise-induced marks
        if not ib1:
            answered = sum(1 for r in rows if r.get('answer'))
            if answered < 5:
                for r in rows:
                    r.update({'answer': None, 'confidence': 0, 'status': 'EMPTY_BLOCK', 'flags': ['EMPTY_BLOCK'], 'tier': 'EMPTY_BLOCK'})
                eblks.add(blk['name'])
        # Capture auto anchors from computed grid for debugging/preview
        if grid and not anchors:
            xct, yct = grid.get('x_centers', []), grid.get('y_centers', [])
            if len(xct) >= 5 and len(yct) >= ROWS_PER_BLOCK:
                if ib1:
                    auto_anchors['q1A'] = [float(xct[0]), float(yct[0])]
                    auto_anchors['q1E'] = [float(xct[4]), float(yct[0])]
                else:
                    auto_anchors['q53A'] = [float(xct[0]), float(yct[0])]
        arows.extend(rows)
    arows.sort(key=lambda r:r['question'])
    if LIMIT_FIRST_BLOCK:
        arows = [r for r in arows if r.get('block') == 'block1' or r.get('question',0) <= ROWS_PER_BLOCK]
    ex = {r['question'] for r in arows}
    for q in range(1, EXPECTED_QUESTION_COUNT+1):
        if q not in ex:
            arows.append({
                'question': q,
                'answer': None,
                'confidence': 0,
                'scores': {},
                'flags': ['BLANK', 'NOT_DETECTED'],
                'status': 'NOT_DETECTED',
                'block': 'unknown',
                'tier': 'NOT_DETECTED',
                'tags': [],
                'veto_reason': None,
                'best': 0.0,
                'delta': 0.0,
                'z': 0.0,
                'noise_gap': 0.0,
                'ink_ratio': 0.0
            })
    arows.sort(key=lambda r:r['question'])
    if MAX_QUESTIONS > 0:
        arows = arows[:MAX_QUESTIONS]
    else:
        arows = arows[: (ROWS_PER_BLOCK if LIMIT_FIRST_BLOCK else EXPECTED_QUESTION_COUNT)]
    pv = create_preview(wf, blks, arows, choices, aths, eblks, dd)
    pvp = os.path.join(outd,'preview.png'); cv2.imwrite(pvp, pv)
    ok = sum(1 for r in arows if r.get('status','').startswith('OK'))
    ans = sum(1 for r in arows if r.get('answer'))
    res = {
        'templateKey': tk,
        'answers': [{
            'question': r['question'],
            'answer': r.get('answer'),
            'confidence': r.get('confidence', 0),
            'scores': r.get('scores', {}),
            'flags': r.get('flags', []),
            'block': r.get('block'),
            'status': r.get('status'),
            'best': float(r.get('best', 0.0) or 0.0),
            'delta': float(r.get('delta', 0.0) or 0.0),
            'z': float(r.get('z', 0.0) or 0.0),
            'noise_gap': float(r.get('noise_gap', 0.0) or 0.0),
            'ink_ratio': float(r.get('ink_ratio', 0.0) or 0.0),
            'tier': r.get('tier'),
            'veto_reason': r.get('veto_reason'),
            'tags': r.get('tags', [])
        } for r in arows],
        'summary': {'total': len(arows), 'answered': ans, 'ok': ok},
        'meta': meta,
        'anchors': anchors or auto_anchors
    }
    rp = os.path.join(outd,'result.json')
    with open(rp,'w',encoding='utf-8') as f: json.dump(res, f, indent=2, ensure_ascii=False)
    return {'success':True,'resultPath':rp,'previewPath':pvp}

def main():
    if len(sys.argv)<4: print(json.dumps({'error':'Usage: python worker.py <input> <template> <output_dir>'})); sys.exit(1)
    os.makedirs(sys.argv[3], exist_ok=True)
    try: print(json.dumps(process(sys.argv[1], sys.argv[2], sys.argv[3])))
    except Exception as e: print(json.dumps({'error':str(e),'traceback':traceback.format_exc()})); sys.exit(1)

if __name__ == '__main__': main()
