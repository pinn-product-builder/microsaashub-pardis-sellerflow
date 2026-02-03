import { Card, CardContent } from '@/components/ui/card';

interface NovaQuotacaoProgressProps {
    currentStep: number;
}

export function NovaQuotacaoProgress({ currentStep }: NovaQuotacaoProgressProps) {
    const stepsList = [
        { id: 1, title: "Cliente", description: "Selecione o cliente" },
        { id: 2, title: "Produtos", description: "Adicione os produtos" },
        { id: 3, title: "Finalização", description: "Revise e finalize" }
    ];

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                    {stepsList.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${currentStep >= step.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                                }`}>
                                {step.id}
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium">{step.title}</p>
                                <p className="text-xs text-muted-foreground">{step.description}</p>
                            </div>
                            {index < stepsList.length - 1 && (
                                <div className="flex-1 h-px bg-border mx-4 min-w-[30px]" />
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
