import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, X } from "lucide-react";

type MultiSelectComboboxProps = {
  options: { id: string; name: string }[];
  selected: { id: string; name: string }[];
  onSelectedChange: (selected: { id: string; name: string }[]) => void;
  placeholder: string;
  searchPlaceholder: string;
};

export const MultiSelectCombobox = ({
  options,
  selected,
  onSelectedChange,
  placeholder,
  searchPlaceholder,
}: MultiSelectComboboxProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (option: { id: string; name: string }) => {
    onSelectedChange([...selected, option]);
    setOpen(false);
  };

  const handleRemove = (id: string) => {
    onSelectedChange(selected.filter((s) => s.id !== id));
  };

  const selectedIds = new Set(selected.map(s => s.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10"
        >
          <div className="flex flex-wrap gap-1">
            {selected.length > 0 ? (
              selected.map(item => (
                <Badge
                  key={item.id}
                  variant="secondary"
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.id);
                  }}
                >
                  {item.name}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {options.filter(option => !selectedIds.has(option.id)).map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => handleSelect(option)}
                >
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};