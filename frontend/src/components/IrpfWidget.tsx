import { formatCurrency } from '../utils/format';

interface IrpfWidgetProps {
  amount: number;
}

export function IrpfWidget({ amount }: IrpfWidgetProps) {
  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline border-l-4 border-l-bn-yellow flex flex-col justify-center">
      <p className="text-xs font-semibold text-bn-muted uppercase tracking-wide mb-2">
        IRPF retenido por clientes
      </p>
      <p className="text-3xl font-bold text-bn-yellow mb-2">{formatCurrency(amount)}</p>
      <p className="text-xs text-bn-muted leading-relaxed">
        Tus clientes ya lo han ingresado a Hacienda en tu nombre.
      </p>
    </div>
  );
}
