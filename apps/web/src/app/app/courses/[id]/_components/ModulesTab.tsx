"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from "@/components/ui/button"
import { GripVertical, Plus, Video, FileText, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { apiClient } from "@/lib/api/client"

interface Content {
    id: string
    title: string
    type: string
    body?: string
    metadata?: { url?: string; duration?: string; pages?: number }
}

interface Module {
    id: string
    title: string
    order: number
    contents: Content[]
}

function ContentItem({ content }: { content: Content }) {
    const isVideo = content.type === "video"
    const isPdf = content.type === "pdf"
    const url = content.metadata?.url

    return (
        <div className="flex items-center gap-3 p-2 ml-8 bg-muted/50 rounded-md text-sm">
            {isVideo && <Video className="h-4 w-4 text-red-500" />}
            {isPdf && <FileText className="h-4 w-4 text-blue-500" />}
            {!isVideo && !isPdf && <FileText className="h-4 w-4 text-muted-foreground" />}
            <div className="flex-1">
                <span className="font-medium">{content.title}</span>
                {content.body && <p className="text-xs text-muted-foreground mt-0.5">{content.body}</p>}
            </div>
            {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    <span className="text-xs">Aç</span>
                </a>
            )}
            {content.metadata?.duration && (
                <span className="text-xs text-muted-foreground">{content.metadata.duration}</span>
            )}
            {content.metadata?.pages && (
                <span className="text-xs text-muted-foreground">{content.metadata.pages} sayfa</span>
            )}
        </div>
    )
}

function SortableItem(props: { id: string; module: Module }) {
    const [expanded, setExpanded] = useState(true)
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-card border rounded-md mb-3">
            <div className="flex items-center gap-2 p-3">
                <button {...attributes} {...listeners} className="cursor-grab hover:text-primary">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </button>
                <button onClick={() => setExpanded(!expanded)} className="hover:text-primary">
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <span className="font-medium flex-1">{props.module.title}</span>
                <span className="text-xs text-muted-foreground">{props.module.contents?.length || 0} içerik</span>
            </div>
            {expanded && props.module.contents && props.module.contents.length > 0 && (
                <div className="px-3 pb-3 space-y-2">
                    {props.module.contents.map(content => (
                        <ContentItem key={content.id} content={content} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ModulesTab({ canEdit }: { canEdit: boolean }) {
    const params = useParams()
    const courseId = params.id as string
    const [modules, setModules] = useState<Module[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!courseId) return
        const fetchModules = async () => {
            try {
                const res = await apiClient.get(`/courses/${courseId}/modules`)
                const data = res.data?.data || []
                // Sort by order
                data.sort((a: Module, b: Module) => (a.order || 0) - (b.order || 0))
                setModules(data)
            } catch (err) {
                console.error("Failed to fetch modules:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchModules()
    }, [courseId])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setModules((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    if (loading) return <div className="p-4 text-muted-foreground">Modüller yükleniyor...</div>

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Ders Modülleri</h3>
                {canEdit && (
                    <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Modül Ekle
                    </Button>
                )}
            </div>

            {canEdit ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={modules.map(m => m.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {modules.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                                    Henüz modül eklenmemiş.
                                </div>
                            ) : (
                                modules.map((module) => (
                                    <SortableItem key={module.id} id={module.id} module={module} />
                                ))
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="space-y-2">
                    {modules.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                            Henüz modül eklenmemiş.
                        </div>
                    ) : (
                        modules.map((module) => (
                            <div key={module.id} className="bg-card border rounded-md mb-3">
                                <div className="flex items-center gap-2 p-3">
                                    <span className="font-medium flex-1">{module.title}</span>
                                    <span className="text-xs text-muted-foreground">{module.contents?.length || 0} içerik</span>
                                </div>
                                {module.contents && module.contents.length > 0 && (
                                    <div className="px-3 pb-3 space-y-2">
                                        {module.contents.map(content => (
                                            <ContentItem key={content.id} content={content} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
