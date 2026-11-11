import { StylePage } from '../StylePage';

/** Daily puzzle n, played Medium: fill the blanks. */
export default function MediumDailyPage({ params }: { params: Promise<{ n: string }> }) {
  return <StylePage style="medium" params={params} />;
}
