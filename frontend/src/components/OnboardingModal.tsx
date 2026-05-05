import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'ii_onboarded';

const STEPS = [
  {
    icon: '📄',
    title: 'Sube tu primera factura',
    description: 'Arrastra un PDF o haz clic para seleccionarlo. La IA extrae todos los datos automáticamente.',
  },
  {
    icon: '✏️',
    title: 'Revisa y confirma',
    description: 'Verifica los datos extraídos, corrígelos si es necesario y confírmalos con un clic.',
  },
  {
    icon: '📊',
    title: 'Explora tu panel',
    description: 'Visualiza ingresos, gastos, IVA, márgenes y mucho más en tiempo real.',
  },
];

export function useOnboarding() {
  const [show, setShow] = useState(() => localStorage.getItem(STORAGE_KEY) !== 'true');

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  };

  return { show, dismiss };
}

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const handleFinish = () => {
    onClose();
    navigate('/upload');
  };

  const current = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-bn-card border border-bn-hairline rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-bn-yellow' : 'w-1.5 bg-bn-hairline'
              }`}
            />
          ))}
        </div>

        <div className="text-center">
          <span className="text-5xl block mb-4">{current.icon}</span>
          <h3 className="text-lg font-bold text-bn-body mb-2">{current.title}</h3>
          <p className="text-sm text-bn-muted leading-relaxed">{current.description}</p>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="w-full bg-bn-yellow text-bn-ink font-semibold py-2.5 rounded-xl hover:bg-bn-yellow-hover transition-colors"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="w-full bg-bn-yellow text-bn-ink font-semibold py-2.5 rounded-xl hover:bg-bn-yellow-hover transition-colors"
            >
              Subir mi primera factura
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full text-sm text-bn-muted hover:text-bn-body transition-colors py-1"
          >
            Saltar introducción
          </button>
        </div>
      </div>
    </div>
  );
}
