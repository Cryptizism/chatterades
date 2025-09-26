import React, { useState } from "react";
import { initialCharades } from "~/routes/home";

type Charades = Record<string, string[]>;
type Category = keyof typeof initialCharades | "";

const CharadesEditor = ({
    charades,
    setCharades,
}: {
    charades: Charades;
    setCharades: React.Dispatch<React.SetStateAction<Charades>>;
}) => {
    const [category, setCategory] = useState<Category>("");
    const [newItem, setNewItem] = useState("");

    const handleAdd = () => {
        if (!newItem.trim()) return;
        setCharades((prev) => ({
            ...prev,
            [category]: [...prev[category], newItem.trim()],
        }));
        setNewItem("");
    };

    const handleRemove = (item: string) => {
        setCharades((prev) => ({
            ...prev,
            [category]: prev[category].filter((i) => i !== item),
        }));
    };

    return (
        <div className="py-6 w-96 mx-auto">
            <h2 className="text-left">Edit Charades by Category</h2>
            <p className="text-left text-gray-500 font-light mb-2">All categories will be played on, <span className="underline">this does not select specific categories</span> just lets you edit them</p>
            <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full p-2 mb-4 border rounded-md"
            >
                <option value="" disabled className="text-gray-600">
                    Select Category
                </option>
                <option value="" disabled className="text-red-500 font-bold underline">
                    DO NOT SELECT A CATEGORY AND SHOW ON STREAM AS IT WILL SPOIL THE GAME
                </option>
                {(Object.keys(charades) as Category[]).map((_category) => (
                    <option key={_category} value={_category} className="text-black">
                        {_category}
                    </option>
                ))}
            </select>

            {category && (
                <>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            placeholder={`Add new ${category}...`}
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            className="flex-1 p-2 border rounded-md"
                        />
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 text-white rounded-md"
                        >
                            Add
                        </button>
                        <button
                            onClick={() => setCharades((prev) => ({ ...prev, [category]: initialCharades[category] }))}
                            className="px-4 py-2 text-red-500 rounded-md"
                        >
                            Reset
                        </button>
                    </div>

                    <div className="border rounded-lg p-4">
                        <div className="flex flex-wrap gap-2">
                            {charades[category].map((item) => (
                                <div
                                    key={item}
                                    className="flex items-center gap-2 bg-gray-700 rounded-full px-3 py-1"
                                >
                                    <span className="text-sm pointer-events-none">{item}</span>
                                    {charades[category].length > 1 ? (
                                        <button
                                            onClick={() => handleRemove(item)}
                                            className="text-red-500 hover:text-red-700 hover:!bg-transparent focus:outline-none"
                                            aria-label={`Remove ${item}`}
                                        >
                                            ✕
                                        </button>
                                    ) : (
                                        <span className="text-gray-500 cursor-not-allowed" title="At least one item required">✕</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default CharadesEditor;