import { StylePage } from '../StylePage';

/** Daily puzzle n, played Easy: arrange the cards. */
export default function EasyDailyPage({ params }: { params: Promise<{ n: string }> }) {
  return <StylePage style="easy" params={params} />;
}
