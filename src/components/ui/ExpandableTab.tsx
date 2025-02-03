import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { TabProps } from "@/types/token";

export const ExpandableTab = ({
  title,
  isOpen,
  onToggle,
  children,
}: TabProps) => (
  <div className="w-full max-w-[600px] mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors"
    >
      <span className="font-medium">{title}</span>
      {isOpen ? (
        <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      ) : (
        <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      )}
    </button>
    {isOpen && <div className="p-4 bg-white dark:bg-gray-800">{children}</div>}
  </div>
);
