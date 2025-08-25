/**
 * SectionCard Component
 * 
 * Wrapper component for demo sections with consistent styling
 */

interface SectionCardProps {
    title: string;
    children: React.ReactNode;
}

export default function SectionCard({ title, children }: SectionCardProps) {
    return (
        <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">{title}</h2>
            {children}
        </div>
    );
}
