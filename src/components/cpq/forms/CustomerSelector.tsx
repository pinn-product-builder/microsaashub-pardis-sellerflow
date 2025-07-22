
import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { mockCustomers } from '@/data/mockData';
import { Customer } from '@/types/cpq';
import { cn } from '@/lib/utils';

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer) => void;
}

export function CustomerSelector({ selectedCustomer, onCustomerSelect }: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchValue) return mockCustomers;
    
    return mockCustomers.filter(customer =>
      customer.companyName.toLowerCase().includes(searchValue.toLowerCase()) ||
      customer.cnpj.includes(searchValue.replace(/\D/g, ''))
    );
  }, [searchValue]);

  const handleSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer">Cliente *</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedCustomer ? (
                <div className="flex items-center truncate">
                  <span className="truncate">{selectedCustomer.companyName}</span>
                  <span className="ml-2 text-muted-foreground">
                    ({selectedCustomer.cnpj})
                  </span>
                </div>
              ) : (
                "Selecione um cliente..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Buscar por nome ou CNPJ..." 
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                <CommandGroup>
                  {filteredCustomers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={`${customer.companyName} ${customer.cnpj}`}
                      onSelect={() => handleSelect(customer)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{customer.companyName}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.cnpj} • {customer.city}/{customer.uf}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedCustomer && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">CNPJ</Label>
                <p className="font-medium">{selectedCustomer.cnpj}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cidade/UF</Label>
                <p className="font-medium">{selectedCustomer.city}/{selectedCustomer.uf}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Limite de Crédito</Label>
                <p className="font-medium">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(selectedCustomer.creditLimit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
