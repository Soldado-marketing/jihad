import { redirect } from 'next/navigation';

// Neural Hub prototype has been removed. Redirect to dashboard.
export default function NeuralHubPreviewPage() {
  redirect('/dashboard');
}
