"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot } from "react-beautiful-dnd";
import { Save, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

interface FurnitureItem {
  id: string;
  type: string;
  position: { x: number; y: number };
  rotation: number;
  dimensions: { width: number; height: number };
}

interface RoomLayoutPlannerProps {
  initialLayout?: FurnitureItem[];
  onSave: (layout: FurnitureItem[]) => void;
  roomSize: { width: number; height: number };
}

const FURNITURE_TYPES = [
  { type: "bed", dimensions: { width: 100, height: 200 } },
  { type: "desk", dimensions: { width: 120, height: 60 } },
  { type: "wardrobe", dimensions: { width: 100, height: 60 } },
  { type: "chair", dimensions: { width: 50, height: 50 } },
];

export function RoomLayoutPlanner({ initialLayout = [], onSave, roomSize }: RoomLayoutPlannerProps) {
  const [layout, setLayout] = useState<FurnitureItem[]>(initialLayout);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    if (!result.destination) return;

    const items = Array.from(layout);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLayout(items);
  };

  const addFurniture = (type: string) => {
    const newItem: FurnitureItem = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 0, y: 0 },
      rotation: 0,
      dimensions: FURNITURE_TYPES.find((f) => f.type === type)?.dimensions || { width: 50, height: 50 },
    };
    setLayout([...layout, newItem]);
  };

  const removeFurniture = (id: string) => {
    setLayout(layout.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    onSave(layout);
    toast.success("Room layout saved successfully!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {FURNITURE_TYPES.map((furniture) => (
            <button
              key={furniture.type}
              onClick={() => addFurniture(furniture.type)}
              className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              <Plus className="mr-2 h-4 w-4" />
              {furniture.type.charAt(0).toUpperCase() + furniture.type.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={handleSave}
          className="flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Save className="mr-2 h-4 w-4" />
          Save Layout
        </button>
      </div>

      <DragDropContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}>
        <Droppable droppableId="room-layout">
          {(provided: DroppableProvided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="relative h-[600px] rounded-lg border-2 border-dashed border-gray-300 bg-white"
              style={{ width: "100%", maxWidth: `${roomSize.width}px`, height: `${roomSize.height}px` }}>
              {layout.map((item, index) => (
                <Draggable
                  key={item.id}
                  draggableId={item.id}
                  index={index}>
                  {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`absolute flex items-center justify-center rounded border ${snapshot.isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-white"}`}
                      style={{
                        width: `${item.dimensions.width}px`,
                        height: `${item.dimensions.height}px`,
                        transform: `rotate(${item.rotation}deg)`,
                        ...provided.draggableProps.style,
                      }}>
                      <span className="text-sm capitalize">{item.type}</span>
                      <button
                        onClick={() => removeFurniture(item.id)}
                        className="absolute -right-2 -top-2 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
