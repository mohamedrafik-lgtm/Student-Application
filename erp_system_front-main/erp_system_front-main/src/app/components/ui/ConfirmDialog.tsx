'use client';

import { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  icon?: ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  type = 'danger',
  isLoading = false,
  icon
}: ConfirmDialogProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-tiba-danger-100',
          iconColor: 'text-tiba-danger-600',
          buttonVariant: 'danger' as const
        };
      case 'warning':
        return {
          iconBg: 'bg-tiba-warning-100',
          iconColor: 'text-tiba-warning-600',
          buttonVariant: 'warning' as const
        };
      case 'info':
        return {
          iconBg: 'bg-tiba-primary-100',
          iconColor: 'text-tiba-primary-600',
          buttonVariant: 'default' as const
        };
      default:
        return {
          iconBg: 'bg-tiba-danger-100',
          iconColor: 'text-tiba-danger-600',
          buttonVariant: 'danger' as const
        };
    }
  };

  const { iconBg, iconColor, buttonVariant } = getTypeStyles();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-right shadow-xl transition-all">
                <div className="absolute top-4 left-4">
                  <button
                    type="button"
                    className="text-tiba-gray-400 hover:text-tiba-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">إغلاق</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex items-center">
                  <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                    {icon || (
                      <ExclamationTriangleIcon
                        className={`h-6 w-6 ${iconColor}`}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-tiba-gray-900 mr-4"
                  >
                    {title}
                  </Dialog.Title>
                </div>

                {description && (
                  <div className="mt-4">
                    <p className="text-sm text-tiba-gray-600">
                      {description}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {cancelText}
                  </Button>
                  <Button
                    variant={buttonVariant}
                    onClick={onConfirm}
                    isLoading={isLoading}
                  >
                    {confirmText}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 