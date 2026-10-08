import { CustomAPI, DefaultRestService } from '@sydle/ui-api';

/**
 * Configuração da API no SYDLE ONE.
 * Preencha com o _id da classe que contém o método público de abertura de ticket
 * (script de referência em `home-page/sydle-one/abrirTicketSite.js`).
 */
export const CONTACT_API_CLASS_ID = '';
export const CONTACT_API_METHOD = 'abrirTicketSite';

/** Limites do formulário (o método no SYDLE ONE valida os mesmos valores). */
export const CONTACT_LIMITS = {
  name: { min: 3, max: 100 },
  phone: { minDigits: 10, maxDigits: 11 },
  email: { max: 120 },
  subject: { min: 3, max: 120 },
  message: { min: 10, max: 1000 },
  attachments: {
    maxFiles: 3,
    maxFileSize: 5 * 1024 * 1024,
    accept: '.pdf,.jpg,.jpeg,.png,.doc,.docx',
    mimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
} as const;

export interface ContactFormValues {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  attachments: File[];
}

export type ContactFormField = keyof ContactFormValues;
export type ContactFormErrors = Partial<Record<ContactFormField, string>>;

export interface UploadedFile {
  _id: string;
  name: string;
  contentType: string;
  length: number;
  hash?: string;
}

export interface OpenTicketPayload {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  attachments: UploadedFile[];
}

export interface OpenTicketResult {
  code?: string;
  searchCode?: string;
}

export class ContactApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ContactApiError';
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const onlyDigits = (value: string) => value.replace(/\D/g, '');

/** Formata dígitos como (31) 99999-9999 ou (31) 3333-4444. */
export const formatPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, CONTACT_LIMITS.phone.maxDigits);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const splitAt = digits.length === 11 ? 5 : 4;
  if (rest.length <= splitAt) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, splitAt)}-${rest.slice(splitAt)}`;
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
};

/** Valida um arquivo isolado; retorna a mensagem de erro ou undefined. */
export const validateFile = (file: File): string | undefined => {
  const { maxFileSize, mimeTypes, accept } = CONTACT_LIMITS.attachments;
  const extension = `.${(file.name.split('.').pop() ?? '').toLowerCase()}`;
  const allowedType = (mimeTypes as readonly string[]).includes(file.type) || accept.split(',').includes(extension);

  if (!allowedType) return `"${file.name}" não é um formato aceito.`;
  if (file.size > maxFileSize) return `"${file.name}" passa de ${formatFileSize(maxFileSize)}.`;
  return undefined;
};

export const validateContactForm = (values: ContactFormValues): ContactFormErrors => {
  const errors: ContactFormErrors = {};
  const { name, phone, email, subject, message, attachments } = CONTACT_LIMITS;

  const nameValue = values.name.trim();
  if (!nameValue) errors.name = 'Informe seu nome.';
  else if (nameValue.length < name.min) errors.name = `Use pelo menos ${name.min} caracteres.`;
  else if (nameValue.length > name.max) errors.name = `Use no máximo ${name.max} caracteres.`;

  const phoneDigits = onlyDigits(values.phone);
  if (!phoneDigits) errors.phone = 'Informe um telefone para contato.';
  else if (phoneDigits.length < phone.minDigits || phoneDigits.length > phone.maxDigits)
    errors.phone = 'Informe o DDD e o número, ex.: (31) 99999-9999.';

  const emailValue = values.email.trim();
  if (!emailValue) errors.email = 'Informe seu e-mail.';
  else if (emailValue.length > email.max) errors.email = `Use no máximo ${email.max} caracteres.`;
  else if (!EMAIL_PATTERN.test(emailValue)) errors.email = 'Informe um e-mail válido.';

  const subjectValue = values.subject.trim();
  if (!subjectValue) errors.subject = 'Informe o assunto.';
  else if (subjectValue.length < subject.min) errors.subject = `Use pelo menos ${subject.min} caracteres.`;
  else if (subjectValue.length > subject.max) errors.subject = `Use no máximo ${subject.max} caracteres.`;

  const messageValue = values.message.trim();
  if (!messageValue) errors.message = 'Escreva sua mensagem.';
  else if (messageValue.length < message.min) errors.message = `Use pelo menos ${message.min} caracteres.`;
  else if (messageValue.length > message.max) errors.message = `Use no máximo ${message.max} caracteres.`;

  if (values.attachments.length > attachments.maxFiles) {
    errors.attachments = `Envie no máximo ${attachments.maxFiles} arquivos.`;
  } else {
    const fileError = values.attachments.map(validateFile).find(Boolean);
    if (fileError) errors.attachments = fileError;
  }

  return errors;
};

let restService: DefaultRestService | undefined;
const getRestService = () => (restService ??= new DefaultRestService());

const ensureConfigured = () => {
  if (!CONTACT_API_CLASS_ID) {
    throw new ContactApiError('O envio ainda não está configurado. Tente novamente mais tarde.');
  }
};

const extractErrorMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') return typeof data === 'string' ? data : undefined;
  const record = data as Record<string, unknown>;
  if (typeof record.message === 'string') return record.message;
  if (Array.isArray(record.errors) && record.errors.length) return extractErrorMessage(record.errors[0]);
  return undefined;
};

/** Envia um arquivo para o SYDLE ONE e devolve os metadados usados no campo de anexos. */
export const uploadAttachment = (file: File, onProgress?: (loaded: number) => void): Promise<UploadedFile> => {
  ensureConfigured();

  return new Promise((resolve, reject) => {
    // buildXHR é o caminho da ui-api para multipart: não força Content-Type JSON.
    const xhr = getRestService().buildXHR({ url: `_classId/${CONTACT_API_CLASS_ID}/_upload`, public: true });
    const fail = () => reject(new ContactApiError(`Não foi possível enviar o arquivo "${file.name}".`, xhr.status));

    xhr.upload.onprogress = (event) => onProgress?.(event.loaded);
    xhr.onerror = fail;
    xhr.ontimeout = fail;
    xhr.onload = () => {
      const response = Array.isArray(xhr.response) ? xhr.response[0] : xhr.response;
      if (xhr.status >= 200 && xhr.status < 300 && response?._id) {
        resolve({
          _id: response._id,
          name: response.name ?? file.name,
          contentType: response.contentType ?? file.type,
          length: response.length ?? file.size,
          hash: response.hash,
        });
      } else {
        fail();
      }
    };

    const form = new FormData();
    form.append('file', file, file.name);
    xhr.send(form);
  });
};

/** Chama o método público que abre o ticket no SYDLE ONE. */
export const openTicket = async (payload: OpenTicketPayload): Promise<OpenTicketResult> => {
  ensureConfigured();

  const api = new CustomAPI(CONTACT_API_CLASS_ID, getRestService());
  const response = await api.fetch<OpenTicketPayload, OpenTicketResult>(CONTACT_API_METHOD, payload, {
    forcePost: true,
    requestParams: { public: true },
  });

  if (response.error) {
    throw new ContactApiError(
      extractErrorMessage(response.error.data) ?? 'Não foi possível enviar sua mensagem. Tente novamente.',
      response.error.status
    );
  }
  return response.data ?? {};
};

/**
 * Fluxo completo: valida, envia os anexos (um por vez) e abre o ticket.
 * `onProgress` recebe a porcentagem total do envio dos anexos (0-100).
 */
export const submitContactTicket = async (
  values: ContactFormValues,
  onProgress?: (percent: number) => void
): Promise<OpenTicketResult> => {
  const errors = validateContactForm(values);
  if (Object.keys(errors).length) throw new ContactApiError('Revise os campos destacados.');

  const totalBytes = values.attachments.reduce((sum, file) => sum + file.size, 0) || 1;
  let sentBytes = 0;
  const uploaded: UploadedFile[] = [];

  for (const file of values.attachments) {
    uploaded.push(await uploadAttachment(file, (loaded) => onProgress?.(((sentBytes + loaded) / totalBytes) * 100)));
    sentBytes += file.size;
  }
  onProgress?.(100);

  return openTicket({
    name: values.name.trim(),
    phone: onlyDigits(values.phone),
    email: values.email.trim().toLowerCase(),
    subject: values.subject.trim(),
    message: values.message.trim(),
    attachments: uploaded,
  });
};
