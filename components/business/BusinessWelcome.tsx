// components/business/BusinessWelcome.tsx
'use client';

import { useState } from 'react';

interface Props {
  onComplete: () => void;
}

export default function BusinessWelcome({ onComplete }: Props) {
  const [step, setStep] = useState(1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {step === 1 && (
          <div className="text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <h2 className="text-2xl font-bold">Welcome to Your Business Dashboard!</h2>
            <p className="text-gray-600">
              Let's set up your business profile in just a few steps.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Get Started
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Setup Checklist</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input type="checkbox" className="w-5 h-5 text-purple-600" />
                <span>Add your business name & logo</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input type="checkbox" className="w-5 h-5 text-purple-600" />
                <span>Set your business hours</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input type="checkbox" className="w-5 h-5 text-purple-600" />
                <span>Add contact information</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input type="checkbox" className="w-5 h-5 text-purple-600" />
                <span>Upload photos to gallery</span>
              </label>
            </div>
            <button
              onClick={onComplete}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Start Building My Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
