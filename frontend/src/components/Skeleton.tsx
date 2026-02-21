export default function BoardSkeleton() {
    return (
        <div className="flex gap-4 p-6 animate-pulse">
            {[1, 2, 3].map((col) => (
                <div
                    key={col}
                    className="bg-gray-200/60 rounded-xl p-3 w-72 flex-shrink-0"
                >
                    {/* Header skeleton */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-4 w-24 bg-gray-300/70 rounded" />
                        <div className="h-4 w-6 bg-gray-300/70 rounded-full" />
                    </div>

                    {/* Card skeletons */}
                    {[1, 2, 3].map((card) => (
                        <div
                            key={card}
                            className="bg-white/70 rounded-lg p-3 mb-2 shadow-sm"
                        >
                            <div className="h-3 w-full bg-gray-200 rounded mb-2" />
                            <div className="h-3 w-2/3 bg-gray-200 rounded" />
                        </div>
                    ))}

                    {/* Add button skeleton */}
                    <div className="h-8 w-full bg-gray-200/50 rounded-lg mt-2" />
                </div>
            ))}
        </div>
    );
}
