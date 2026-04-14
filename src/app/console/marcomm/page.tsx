import { readFileSync } from 'fs';
import { join } from 'path';

export default function MarcommPage() {
  const filePath = join(process.cwd(), 'public/console/marcomm.html');
  const htmlContent = readFileSync(filePath, 'utf-8');

  return (
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}
