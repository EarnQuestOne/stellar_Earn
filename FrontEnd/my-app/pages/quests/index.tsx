import { GetStaticProps } from 'next';
import QuestList from '@/components/quests/QuestList';
import { fetchPublicQuests, Quest } from '@/lib/api/quests';

interface QuestsPageProps {
  quests: Quest[];
}

export default function QuestsPage({ quests }: QuestsPageProps) {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Explore Quests</h1>
      <QuestList initialQuests={quests} />
    </main>
  );
}

export const getStaticProps: GetStaticProps<QuestsPageProps> = async () => {
  try {
    const quests = await fetchPublicQuests();

    return {
      props: {
        quests,
      },
      // ISR Revalidation window: 60 seconds
      revalidate: 60,
    };
  } catch (error) {
    console.error('Failed to pre-render quests listing:', error);
    return {
      props: {
        quests: [],
      },
      revalidate: 10, // Retry quicker on error
    };
  }
};