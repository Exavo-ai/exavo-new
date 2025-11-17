import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  actions?: ReactNode;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Search...",
  onSearch,
  actions,
  className,
}: DataTableProps<T>) {
  return (
    <Card className={className}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-10 h-10 sm:h-auto"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs sm:text-sm text-muted-foreground">
                  {columns.map((column, index) => (
                    <th key={index} className="pb-3 px-4 sm:px-0 font-medium whitespace-nowrap">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    {columns.map((column, colIndex) => {
                      const value = typeof column.accessor === 'function'
                        ? column.accessor(row)
                        : row[column.accessor];
                      
                      return (
                        <td key={colIndex} className={`py-3 sm:py-4 px-4 sm:px-0 text-xs sm:text-sm ${column.className || ''}`}>
                          {value as ReactNode}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
