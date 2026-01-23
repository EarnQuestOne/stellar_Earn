export class Submission {
  id: string;          // Unique submission ID
  userId: string;      // User who submitted
  questId: string;     // Quest the submission belongs to
  fileUrl: string;     // URL/path to uploaded file
  proofHash: string;   // Hash of the submission for validation
  status: 'pending' | 'approved' | 'rejected'; // Submission state
  createdAt: Date;     // Timestamp
}
