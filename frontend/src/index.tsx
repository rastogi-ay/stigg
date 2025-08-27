import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { StiggProvider } from '@stigg/react-sdk';

const STIGG_CLIENT_API_KEY = process.env.REACT_APP_STIGG_CLIENT_API_KEY;
const CUSTOMER_ID = process.env.REACT_APP_CUSTOMER_ID;

if (!STIGG_CLIENT_API_KEY || !CUSTOMER_ID) {
  throw new Error("Missing environment variables: REACT_APP_STIGG_CLIENT_API_KEY, REACT_APP_CUSTOMER_ID");
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <StiggProvider apiKey={STIGG_CLIENT_API_KEY} customerId={CUSTOMER_ID}>
      <App />
    </StiggProvider>
  </React.StrictMode>
);