import type { Metadata } from 'next';
import { OrdersBoard } from '@/components/admin/OrdersBoard';

export const metadata: Metadata = { title: 'Pedidos' };

export default function PedidosPage() {
  return <OrdersBoard />;
}
