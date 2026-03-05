/**
 * Hook para manejar modales de alerta, confirmación y prompt
 * Reemplaza window.alert(), window.confirm() y window.prompt()
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertModal } from '../components/ui/AlertModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { PromptModal } from '../components/ui/PromptModal';

type AlertType = 'info' | 'success' | 'warning' | 'error';
type ConfirmType = 'danger' | 'warning' | 'info';

interface AlertOptions {
  title?: string;
  type?: AlertType;
  buttonText?: string;
}

interface ConfirmOptions {
  title: string;
  message: string | ReactNode;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
  icon?: ReactNode;
}

interface PromptOptions {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  inputType?: 'text' | 'textarea';
  required?: boolean;
  maxLength?: number;
}

interface ModalContextType {
  alert: (message: string | ReactNode, options?: AlertOptions) => Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Alert state
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    message: string | ReactNode;
    options: AlertOptions;
    resolve: (() => void) | null;
  }>({
    isOpen: false,
    message: '',
    options: {},
    resolve: null,
  });

  // Confirm state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  // Prompt state
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    options: PromptOptions | null;
    resolve: ((value: string | null) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  // Alert function
  const alert = useCallback((message: string | ReactNode, options: AlertOptions = {}): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        message,
        options,
        resolve,
      });
    });
  }, []);

  // Confirm function
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  // Prompt function
  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  // Handlers
  const handleAlertClose = () => {
    alertState.resolve?.();
    setAlertState({ isOpen: false, message: '', options: {}, resolve: null });
  };

  const handleConfirmClose = (result: boolean) => {
    confirmState.resolve?.(result);
    setConfirmState({ isOpen: false, options: null, resolve: null });
  };

  const handlePromptClose = (result: string | null) => {
    promptState.resolve?.(result);
    setPromptState({ isOpen: false, options: null, resolve: null });
  };

  return (
    <ModalContext.Provider value={{ alert, confirm, prompt }}>
      {children}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={handleAlertClose}
        message={alertState.message}
        title={alertState.options.title}
        type={alertState.options.type}
        buttonText={alertState.options.buttonText}
      />

      {/* Confirm Modal */}
      {confirmState.options && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          onClose={() => handleConfirmClose(false)}
          onConfirm={() => handleConfirmClose(true)}
          title={confirmState.options.title}
          message={confirmState.options.message}
          type={confirmState.options.type}
          confirmText={confirmState.options.confirmText}
          cancelText={confirmState.options.cancelText}
          icon={confirmState.options.icon}
        />
      )}

      {/* Prompt Modal */}
      {promptState.options && (
        <PromptModal
          isOpen={promptState.isOpen}
          onClose={() => handlePromptClose(null)}
          onConfirm={(value) => handlePromptClose(value)}
          title={promptState.options.title}
          message={promptState.options.message}
          placeholder={promptState.options.placeholder}
          defaultValue={promptState.options.defaultValue}
          confirmText={promptState.options.confirmText}
          cancelText={promptState.options.cancelText}
          inputType={promptState.options.inputType}
          required={promptState.options.required}
          maxLength={promptState.options.maxLength}
        />
      )}
    </ModalContext.Provider>
  );
};

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal debe ser usado dentro de un ModalProvider');
  }
  return context;
};

export default useModal;
