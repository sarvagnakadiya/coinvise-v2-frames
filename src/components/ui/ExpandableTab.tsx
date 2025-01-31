import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { TabProps } from "@/types/token";

export const ExpandableTab = ({
  title,
  isOpen,
  onToggle,
  children,
}: TabProps) => (
  <div className="w-full max-w-[600px] mb-4 border rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100"
    >
      <span className="font-medium">{title}</span>
      {isOpen ? (
        <ChevronUpIcon className="h-5 w-5" />
      ) : (
        <ChevronDownIcon className="h-5 w-5" />
      )}
    </button>
    {isOpen && <div className="p-4">{children}</div>}
  </div>
);
