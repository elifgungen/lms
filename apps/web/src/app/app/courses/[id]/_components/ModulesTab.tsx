"use client"

import { useState } from "react"
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

import { mockModules } from "@/lib/mockData"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { GripVertical, Plus } from "lucide-react"

function SortableItem(props: { id: string; title: string }) {
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
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 bg-card border rounded-md mb-2">
            <button {...attributes} {...listeners} className="cursor-grab hover:text-primary">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="font-medium">{props.title}</span>
        </div>
    );
}

export default function ModulesTab() {
    const [items, setItems] = useState(mockModules)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Course Modules</h3>
                <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Module
                </Button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={items.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="bg-muted/30 p-4 rounded-lg">
                        {items.map((module) => (
                            <SortableItem key={module.id} id={module.id} title={module.title} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    )
}
