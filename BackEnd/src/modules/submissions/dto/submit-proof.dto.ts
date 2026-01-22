export class SubmitProofDto {
  userId: string;   // ID of the user submitting
  questId: string;  // Quest being submitted
  fileName: string; // Name of uploaded file
  fileContent: string; // Base64 or path of file (simplified)
}
