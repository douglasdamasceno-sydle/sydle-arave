import type { EventEmitter } from '@stencil/core';
import { Component, Event, h, Host, Prop, State, Watch } from '@stencil/core';

import type {
  ContactFormErrors,
  ContactFormField,
  ContactFormValues,
  OpenTicketResult,
} from '../../services/contact-ticket-api';
import {
  CONTACT_LIMITS,
  ContactApiError,
  formatFileSize,
  formatPhone,
  submitContactTicket,
  validateContactForm,
  validateFile,
} from '../../services/contact-ticket-api';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

const emptyValues = (subject = ''): ContactFormValues => ({
  name: '',
  phone: '',
  email: '',
  subject,
  message: '',
  attachments: [],
});

@Component({
  tag: 'sy-lib-contact-modal',
  styleUrl: 'scss/index.scss',
  shadow: true,
})
export class ContactModal {
  private dialogEl?: HTMLDialogElement;
  private fileInputEl?: HTMLInputElement;
  private honeypotEl?: HTMLInputElement;

  /** Controla a abertura do modal. */
  @Prop() open = false;

  /** Assunto pré-preenchido ao abrir o modal. */
  @Prop() defaultSubject = '';

  @State() values: ContactFormValues = emptyValues();
  @State() errors: ContactFormErrors = {};
  @State() touched: Partial<Record<ContactFormField, boolean>> = {};
  @State() status: SubmitStatus = 'idle';
  @State() submitError = '';
  @State() uploadProgress = 0;
  @State() result: OpenTicketResult = {};
  @State() dragging = false;

  /** Disparado quando o usuário fecha o modal (botão, Esc ou clique fora). */
  @Event() syLibContactModalClose: EventEmitter<void>;

  @Watch('open')
  handleOpenChange(open: boolean) {
    if (open) this.show();
    else this.hide();
  }

  componentDidLoad() {
    if (this.open) this.show();
  }

  disconnectedCallback() {
    document.documentElement.style.removeProperty('overflow');
  }

  private show() {
    if (this.status !== 'submitting') this.reset();
    if (!this.dialogEl?.open) this.dialogEl?.showModal();
    document.documentElement.style.overflow = 'hidden';
  }

  private hide() {
    if (this.dialogEl?.open) this.dialogEl.close();
    document.documentElement.style.removeProperty('overflow');
  }

  private reset() {
    this.values = emptyValues(this.defaultSubject);
    this.errors = {};
    this.touched = {};
    this.status = 'idle';
    this.submitError = '';
    this.uploadProgress = 0;
    this.result = {};
  }

  /**
   * Mantém o foco no campo atual ao pressionar um botão de ação. Sem isso, o blur do campo
   * exibe a mensagem de erro, o botão desce e o clique termina fora dele.
   */
  private keepFocus = (event: MouseEvent) => event.preventDefault();

  private requestClose = () => {
    if (this.status === 'submitting') return;
    this.syLibContactModalClose.emit();
  };

  private handleCancel = (event: Event) => {
    // Esc: o dialog fecharia sozinho; quem controla é a prop `open`.
    event.preventDefault();
    this.requestClose();
  };

  private handleBackdropClick = (event: MouseEvent) => {
    if (event.target === this.dialogEl) this.requestClose();
  };

  private setValue(field: Exclude<ContactFormField, 'attachments'>, raw: string) {
    const value = field === 'phone' ? formatPhone(raw) : raw;
    this.values = { ...this.values, [field]: value };
    if (this.touched[field]) this.revalidate(field);
  }

  private revalidate(field: ContactFormField) {
    const fieldError = validateContactForm(this.values)[field];
    this.errors = { ...this.errors, [field]: fieldError };
  }

  private markTouched(field: ContactFormField) {
    this.touched = { ...this.touched, [field]: true };
    this.revalidate(field);
  }

  private addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const { maxFiles } = CONTACT_LIMITS.attachments;
    const current = this.values.attachments;
    const incoming = Array.from(fileList).filter(
      (file) => !current.some((existing) => existing.name === file.name && existing.size === file.size)
    );
    const invalid = incoming.map(validateFile).find(Boolean);
    const valid = incoming.filter((file) => !validateFile(file));
    const room = maxFiles - current.length;

    this.values = { ...this.values, attachments: [...current, ...valid.slice(0, Math.max(room, 0))] };
    this.touched = { ...this.touched, attachments: true };
    this.errors = {
      ...this.errors,
      attachments: invalid ?? (valid.length > room ? `Envie no máximo ${maxFiles} arquivos.` : undefined),
    };
    if (this.fileInputEl) this.fileInputEl.value = '';
  }

  private removeFile(index: number) {
    const attachments = this.values.attachments.filter((_, i) => i !== index);
    this.values = { ...this.values, attachments };
    this.errors = { ...this.errors, attachments: undefined };
  }

  private handleDrop = (event: DragEvent) => {
    event.preventDefault();
    this.dragging = false;
    this.addFiles(event.dataTransfer?.files ?? null);
  };

  private handleSubmit = async (event: Event) => {
    event.preventDefault();
    if (this.status === 'submitting') return;

    const errors = validateContactForm(this.values);
    this.errors = errors;
    this.touched = { name: true, phone: true, email: true, subject: true, message: true, attachments: true };

    if (Object.keys(errors).length) {
      const firstInvalid = this.dialogEl?.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    // Campo invisível para humanos: se vier preenchido, é bot. Finge sucesso sem enviar.
    if (this.honeypotEl?.value) {
      this.status = 'success';
      return;
    }

    this.status = 'submitting';
    this.submitError = '';
    this.uploadProgress = 0;

    try {
      this.result = await submitContactTicket(this.values, (percent) => (this.uploadProgress = Math.round(percent)));
      this.status = 'success';
    } catch (error) {
      this.status = 'error';
      this.submitError =
        error instanceof ContactApiError ? error.message : 'Não foi possível enviar sua mensagem. Tente novamente.';
    }
  };

  private renderCounter(field: 'name' | 'email' | 'subject' | 'message') {
    const max = CONTACT_LIMITS[field].max;
    const length = this.values[field].length;
    return <span class={{ counter: true, 'is-near': length >= max * 0.9 }}>{`${length}/${max}`}</span>;
  }

  private renderError(field: ContactFormField) {
    const error = this.touched[field] && this.errors[field];
    return error ? (
      <span class="field-error" id={`${field}-error`} role="alert">
        {error}
      </span>
    ) : null;
  }

  private fieldA11y(field: ContactFormField) {
    const invalid = Boolean(this.touched[field] && this.errors[field]);
    return {
      'aria-invalid': invalid ? 'true' : 'false',
      'aria-describedby': invalid ? `${field}-error` : undefined,
    };
  }

  private renderTextField(
    field: 'name' | 'email' | 'subject',
    label: string,
    props: { type?: string; autocomplete?: string; placeholder?: string }
  ) {
    return (
      <div class={{ field: true, 'has-error': Boolean(this.touched[field] && this.errors[field]) }}>
        <div class="field-label-row">
          <label htmlFor={field}>
            {label} <span class="required">*</span>
          </label>
          {this.renderCounter(field)}
        </div>
        <input
          id={field}
          name={field}
          type={props.type ?? 'text'}
          autocomplete={props.autocomplete}
          placeholder={props.placeholder}
          maxLength={CONTACT_LIMITS[field].max}
          required
          value={this.values[field]}
          onInput={(event) => this.setValue(field, (event.target as HTMLInputElement).value)}
          onBlur={() => this.markTouched(field)}
          {...this.fieldA11y(field)}
        />
        {this.renderError(field)}
      </div>
    );
  }

  private renderForm() {
    const submitting = this.status === 'submitting';
    const { attachments } = this.values;
    const { maxFiles, maxFileSize, accept } = CONTACT_LIMITS.attachments;

    return (
      <form class="contact-form" noValidate onSubmit={this.handleSubmit}>
        <fieldset disabled={submitting}>
          {this.renderTextField('name', 'Nome', { autocomplete: 'name', placeholder: 'Seu nome completo' })}

          <div class="field-row">
            <div class={{ field: true, 'has-error': Boolean(this.touched.phone && this.errors.phone) }}>
              <div class="field-label-row">
                <label htmlFor="phone">
                  Telefone para contato <span class="required">*</span>
                </label>
              </div>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autocomplete="tel-national"
                placeholder="(31) 99999-9999"
                maxLength={15}
                required
                value={this.values.phone}
                onInput={(event) => {
                  const input = event.target as HTMLInputElement;
                  this.setValue('phone', input.value);
                  input.value = this.values.phone;
                }}
                onBlur={() => this.markTouched('phone')}
                {...this.fieldA11y('phone')}
              />
              {this.renderError('phone')}
            </div>

            {this.renderTextField('email', 'E-mail', {
              type: 'email',
              autocomplete: 'email',
              placeholder: 'voce@exemplo.com',
            })}
          </div>

          {this.renderTextField('subject', 'Assunto', { placeholder: 'Sobre o que você quer falar?' })}

          <div class={{ field: true, 'has-error': Boolean(this.touched.message && this.errors.message) }}>
            <div class="field-label-row">
              <label htmlFor="message">
                Mensagem <span class="required">*</span>
              </label>
              {this.renderCounter('message')}
            </div>
            <textarea
              id="message"
              name="message"
              rows={5}
              placeholder="Conte um pouco sobre você e o que procura na ARAVE."
              maxLength={CONTACT_LIMITS.message.max}
              required
              value={this.values.message}
              onInput={(event) => this.setValue('message', (event.target as HTMLTextAreaElement).value)}
              onBlur={() => this.markTouched('message')}
              {...this.fieldA11y('message')}
            ></textarea>
            {this.renderError('message')}
          </div>

          <div class={{ field: true, 'has-error': Boolean(this.touched.attachments && this.errors.attachments) }}>
            <div class="field-label-row">
              <span class="label" id="attachments-label">
                Anexos <span class="optional">(opcional)</span>
              </span>
              <span class="counter">{`${attachments.length}/${maxFiles}`}</span>
            </div>

            <label
              class={{ dropzone: true, 'is-dragging': this.dragging, 'is-full': attachments.length >= maxFiles }}
              onDragOver={(event) => {
                event.preventDefault();
                this.dragging = true;
              }}
              onDragLeave={() => (this.dragging = false)}
              onDrop={this.handleDrop}
            >
              <input
                ref={(el) => (this.fileInputEl = el)}
                type="file"
                multiple
                accept={accept}
                disabled={attachments.length >= maxFiles}
                aria-labelledby="attachments-label"
                onChange={(event) => this.addFiles((event.target as HTMLInputElement).files)}
                {...this.fieldA11y('attachments')}
              />
              <span class="dropzone-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <path d="m17 8-5-5-5 5"></path>
                  <path d="M12 3v12"></path>
                </svg>
              </span>
              <span class="dropzone-text">
                <strong>Clique para escolher</strong> ou arraste os arquivos aqui
              </span>
              <span class="dropzone-hint">
                PDF, JPG, PNG ou DOC · até {formatFileSize(maxFileSize)} cada · máx. {maxFiles} arquivos
              </span>
            </label>

            {attachments.length > 0 && (
              <ul class="file-list">
                {attachments.map((file, index) => (
                  <li key={`${file.name}-${file.size}`} class="file-item">
                    <span class="file-name">{file.name}</span>
                    <span class="file-size">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      class="file-remove"
                      aria-label={`Remover ${file.name}`}
                      onClick={() => this.removeFile(index)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                      >
                        <path d="M18 6 6 18M6 6l12 12"></path>
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {this.renderError('attachments')}
          </div>

          {/* Honeypot anti-spam: invisível e fora da ordem de tabulação */}
          <div class="hp-field" aria-hidden="true">
            <label htmlFor="website">Não preencha este campo</label>
            <input
              ref={(el) => (this.honeypotEl = el)}
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autocomplete="off"
            />
          </div>
        </fieldset>

        {this.status === 'error' && (
          <div class="submit-error" role="alert">
            {this.submitError}
          </div>
        )}

        <div class="form-actions">
          <button
            type="button"
            class="btn btn-ghost"
            onMouseDown={this.keepFocus}
            onClick={this.requestClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" onMouseDown={this.keepFocus} disabled={submitting}>
            {submitting && <span class="spinner" aria-hidden="true"></span>}
            {submitting
              ? attachments.length && this.uploadProgress < 100
                ? `Enviando anexos… ${this.uploadProgress}%`
                : 'Enviando…'
              : 'Enviar mensagem'}
          </button>
        </div>
      </form>
    );
  }

  private renderSuccess() {
    const protocol = this.result.searchCode ?? this.result.code;
    return (
      <div class="success-view" role="status">
        <span class="success-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 6 9 17l-5-5"></path>
          </svg>
        </span>
        <h3>Mensagem enviada!</h3>
        <p>Recebemos seu contato e nossa equipe vai responder pelo telefone ou e-mail informado.</p>
        {protocol && (
          <p class="protocol">
            Protocolo: <strong>{protocol}</strong>
          </p>
        )}
        <button type="button" class="btn btn-primary" onClick={this.requestClose}>
          Fechar
        </button>
      </div>
    );
  }

  render() {
    return (
      <Host>
        <dialog
          ref={(el) => (this.dialogEl = el)}
          class="contact-dialog"
          aria-labelledby="contact-title"
          onCancel={this.handleCancel}
          onClick={this.handleBackdropClick}
        >
          <div class="dialog-card">
            <header class="dialog-header">
              <div>
                <span class="dialog-eyebrow">Associe-se</span>
                <h2 id="contact-title">Fale com a ARAVE</h2>
                <p>Preencha seus dados e nossa equipe entrará em contato.</p>
              </div>
              <button
                type="button"
                class="close-btn"
                onMouseDown={this.keepFocus}
                aria-label="Fechar"
                onClick={this.requestClose}
                disabled={this.status === 'submitting'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M18 6 6 18M6 6l12 12"></path>
                </svg>
              </button>
            </header>

            <div class="dialog-body">{this.status === 'success' ? this.renderSuccess() : this.renderForm()}</div>
          </div>
        </dialog>
      </Host>
    );
  }
}
