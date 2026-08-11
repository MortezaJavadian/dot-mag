/**
 * Lexical Playground Wrapper
 */

import * as React from 'react';
import App from './App';
import setupEnv from './setupEnv';
import './index.css';

if (setupEnv.emptyEditor) {
  // side-effects of importing setupEnv
}

interface LexicalPlaygroundEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeightClass?: string;
}

export default function LexicalPlaygroundEditor({ value, onChange, disabled, placeholder, minHeightClass }: LexicalPlaygroundEditorProps) {
  return (
    <div className={`lexical-playground-wrapper ${minHeightClass || ''}`}>
      <App htmlContent={value} onChange={onChange} />
    </div>
  );
}
