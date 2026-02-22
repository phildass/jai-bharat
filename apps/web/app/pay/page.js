'use client';

import { useEffect } from 'react';

const PAYMENT_DESTINATION =
  process.env.NEXT_PUBLIC_PAYMENT_URL || 'https://aienter.in/payments/jaibharat';

export default function PayPage() {
  useEffect(() => {
    window.location.href = PAYMENT_DESTINATION;
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <p style={{ fontSize: 18, color: '#444' }}>Redirecting to payment…</p>
    </div>
  );
}
