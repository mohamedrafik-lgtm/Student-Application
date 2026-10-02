"use client";

import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { FiAlertTriangle, FiX, FiTrash2, FiCheck } from "react-icons/fi";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  details?: string[];
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "موافق",
  cancelText = "إلغاء",
  type = "danger",
  details = []
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          headerBg: 'bg-gradient-to-r from-red-500 to-red-600',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBg: 'bg-red-600 hover:bg-red-700'
        };
      case 'warning':
        return {
          headerBg: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700'
        };
      default:
        return {
          headerBg: 'bg-gradient-to-r from-blue-500 to-blue-600',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBg: 'bg-blue-600 hover:bg-blue-700'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <Card className="relative z-10 w-full max-w-md mx-4 shadow-2xl border-2 border-gray-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <CardHeader className={`${styles.headerBg} text-white rounded-t-lg relative`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${styles.iconBg} rounded-lg`}>
                <FiAlertTriangle className={`h-5 w-5 ${styles.iconColor}`} />
              </div>
              <CardTitle className="text-lg font-bold text-white">
                {title}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-1 h-8 w-8"
            >
              <FiX className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-6 space-y-4">
          <CardDescription className="text-gray-700 text-base leading-relaxed">
            {description}
          </CardDescription>

          {details.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FiAlertTriangle className="h-4 w-4 text-orange-500" />
                تفاصيل مهمة:
              </h4>
              <ul className="space-y-2">
                {details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            >
              <FiX className="h-4 w-4 mr-2" />
              {cancelText}
            </Button>
            <Button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 ${styles.confirmBg} text-white`}
            >
              <FiTrash2 className="h-4 w-4 mr-2" />
              {confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
