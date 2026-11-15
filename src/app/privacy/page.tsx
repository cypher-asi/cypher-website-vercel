import type { Metadata } from 'next';
import { LegalDocument } from '@/components/LegalDocument';
import { privacyContent as content } from './content';

export const metadata: Metadata = {
  title: content.metaTitle,
  description: content.metaDescription,
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title={content.title}
      description={content.description}
      effectiveDate={content.effectiveDate}
      intro={content.intro}
      sections={content.sections}
      contactBody={content.contactBody}
      email={content.email}
    />
  );
}
