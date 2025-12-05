import { motion } from "framer-motion";

type Technology = {
    name: string;
    level: number;
    description: string;
};

type Stack = {
    name: string;
    color: string;
    technologies: Technology[];
};

type TechWithMeta = Technology & {
    category: string;
    color: string;
    stackIndex: number;
    indexInStack: number;
};

interface CategoryListProps {
    techStacks: Stack[];
    onSelect: (tech: TechWithMeta) => void;
    variant?: "list" | "card";
}

export function CategoryList({ techStacks, onSelect, variant = "list" }: CategoryListProps) {
    return (
        <div className={variant === "list" ? "space-y-2" : "space-y-4"}>
            {techStacks.map((stack, stackIndex) => (
                <motion.div
                    key={stack.name}
                    whileHover={{ scale: 1.02 }}
                    className={
                        variant === "card"
                            ? "card-elegant cursor-pointer"
                            : "w-full p-3 rounded-lg bg-card border cursor-pointer"
                    }
                    onClick={() =>
                        onSelect({
                            ...stack.technologies[0],
                            category: stack.name,
                            color: stack.color,
                            stackIndex,
                            indexInStack: 0,
                        })
                    }
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: stack.color }}
                            />
                            <h4 className="font-semibold">{stack.name}</h4>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {stack.technologies.length} technologies
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
