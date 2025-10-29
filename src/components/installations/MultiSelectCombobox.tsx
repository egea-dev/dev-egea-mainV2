import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [query, setQuery] = useState("");

  const selectedIds = new Set(selected.map((item) => item.id));

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      option.name.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  const toggleSelect = (option: { id: string; name: string }) => {
    const exists = selectedIds.has(option.id);
    if (exists) {
      onSelectedChange(selected.filter((item) => item.id !== option.id));
    } else {
      onSelectedChange([...selected, option]);
    }
  };

  const handleRemove = (id: string) => {
    onSelectedChange(selected.filter((s) => s.id !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-10 w-full justify-between border-border/70 bg-card/70 text-left font-medium text-foreground hover:bg-secondary/30"
        >
          <div className="flex flex-wrap gap-1">
            {selected.length > 0 ? (
              selected.map((item) => (
                <Badge
                  key={item.id}
                  variant="secondary"
                  className="mr-1 border-border/70 bg-transparent text-foreground transition hover:bg-secondary/40"
                  onClick={(event) => {
                    event.stopPropagation();
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
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[10050] w-[--radix-popover-trigger-width] rounded-xl border border-border/70 bg-popover/95 p-0 text-popover-foreground backdrop-blur-xl">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
            className="h-10 border-none bg-transparent text-foreground placeholder:text-muted-foreground"
          />
          <CommandList className="max-h-60 overflow-auto text-foreground">
            <CommandEmpty className="px-3 py-6 text-sm text-muted-foreground">No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Sin coincidencias
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedIds.has(option.id);
                  return (
                    <CommandItem
                      key={option.id}
                      value={option.name}
                      onSelect={() => toggleSelect(option)}
                      className={cn(
                        "cursor-pointer hover:bg-secondary/30",
                        isSelected && "bg-primary/20 text-foreground"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 text-primary",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.name}
                    </CommandItem>
                  );
                })
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
