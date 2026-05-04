import { formatCurrency } from '../utils/format';
import { InfoTooltip } from './InfoTooltip';

interface IrpfWidgetProps {
  amount: number;
}

export function IrpfWidget({ amount }: IrpfWidgetProps) {
  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline border-l-4 border-l-bn-yellow flex flex-col justify-center">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-bn-muted uppercase tracking-wide">
          IRPF retenido por clientes
        </p>
        <InfoTooltip text="Suma del IRPF que tus clientes han retenido en tus facturas de ingreso durante el periodo. Ellos lo ingresan a Hacienda directamente en tu nombre." />
      </div>
      <p className="text-3xl font-bold text-bn-yellow mb-2">{formatCurrency(amount)}</p>
      <p className="text-xs text-bn-muted leading-relaxed">
        Tus clientes ya lo han ingresado a Hacienda en tu nombre.
      </p>
    </div>
  );
}
