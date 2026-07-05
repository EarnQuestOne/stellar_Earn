/**
 * Minimal shape of a multipart file as produced by Multer.
 *
 * Declared locally so the upload utilities do not depend on `@types/multer`
 * being installed. It is structurally compatible with `Express.Multer.File`.
 */
export interface UploadedFileLike {
  /** Field name specified in the form. */
  fieldname: string;
  /** Name of the file on the uploader's computer. */
  originalname: string;
  /** Value of the `Content-Transfer-Encoding` header for this file. */
  encoding: string;
  /** MIME type declared by the client (untrusted, may be spoofed). */
  mimetype: string;
  /** Size of the file in bytes. */
  size: number;
  /** Buffer of the entire file (present when using memory storage). */
  buffer: Buffer;
}
