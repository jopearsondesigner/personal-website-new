// DO NOT REMOVE THIS COMMENT
// /src/lib/types/contact.ts
// DO NOT REMOVE THIS COMMENT

/**
 * Contact form data structure
 */
export interface ContactFormData {
	name: string;
	email: string;
	message: string;
}

/**
 * Contact form validation errors
 */
export interface ContactFormErrors {
	name: string;
	email: string;
	message: string;
}

/**
 * Contact form validation rules
 */
export interface ContactFormValidation {
	name: {
		required: boolean;
		minLength?: number;
		maxLength?: number;
	};
	email: {
		required: boolean;
		pattern?: RegExp;
	};
	message: {
		required: boolean;
		minLength?: number;
		maxLength?: number;
	};
}

/**
 * Contact form state management
 */
export interface ContactFormState {
	data: ContactFormData;
	errors: ContactFormErrors;
	isSubmitting: boolean;
	isSubmitted: boolean;
	hasError: boolean;
	isDirty: boolean;
	isValid: boolean;
}

/**
 * Contact form submission response
 */
export interface ContactFormResponse {
	success: boolean;
	message: string;
	timestamp?: Date;
	submissionId?: string;
}

/**
 * Contact form configuration
 */
export interface ContactFormConfig {
	validation: ContactFormValidation;
	submitEndpoint?: string;
	autoResetOnSuccess?: boolean;
	showLoadingState?: boolean;
	enableSpamProtection?: boolean;
	maxSubmissionRate?: number; // submissions per minute
}

/**
 * Contact method information
 */
export interface ContactMethod {
	type: 'email' | 'phone' | 'social' | 'address';
	label: string;
	value: string;
	href?: string;
	icon?: string;
	primary?: boolean;
}

/**
 * Social media link
 */
export interface SocialLink {
	platform: 'github' | 'linkedin' | 'twitter' | 'dribbble' | 'behance';
	url: string;
	username?: string;
	ariaLabel: string;
}

/**
 * Contact section configuration
 */
export interface ContactSectionConfig {
	heading: string;
	subheading?: string;
	description?: string;
	contactMethods: ContactMethod[];
	socialLinks?: SocialLink[];
	showForm: boolean;
	responseTimeMessage?: string;
}

/**
 * Form field configuration
 */
export interface FormFieldConfig {
	name: keyof ContactFormData;
	type: 'text' | 'email' | 'textarea' | 'tel';
	label: string;
	placeholder?: string;
	required: boolean;
	autoComplete?: string;
	rows?: number; // for textarea
	maxLength?: number;
	minLength?: number;
}

/**
 * Validation result for individual field
 */
export interface FieldValidationResult {
	isValid: boolean;
	error?: string;
	warningMessage?: string;
}

/**
 * Complete form validation result
 */
export interface FormValidationResult {
	isValid: boolean;
	errors: ContactFormErrors;
	fieldResults: Record<keyof ContactFormData, FieldValidationResult>;
}

/**
 * Form submission options
 */
export interface SubmissionOptions {
	preventDuplicates?: boolean;
	includeTimestamp?: boolean;
	includeUserAgent?: boolean;
	includeReferrer?: boolean;
	honeypotField?: string;
}

/**
 * Animation configuration for contact section
 */
export interface ContactAnimationConfig {
	enableAnimations: boolean;
	staggerDelay: number;
	duration: number;
	easing: string;
	respectReducedMotion: boolean;
}

/**
 * Accessibility configuration
 */
export interface ContactA11yConfig {
	announceErrors: boolean;
	announceSuccess: boolean;
	focusManagement: boolean;
	highContrastMode: boolean;
	screenReaderOptimized: boolean;
}

/**
 * Theme configuration for contact section
 */
export interface ContactThemeConfig {
	variant: 'minimal' | 'arcade' | 'split-screen';
	colorScheme: 'light' | 'dark' | 'auto';
	spacing: 'compact' | 'normal' | 'spacious';
	borderRadius: 'none' | 'small' | 'medium' | 'large';
	animations: ContactAnimationConfig;
	accessibility: ContactA11yConfig;
}

/**
 * Contact form event handlers
 */
export interface ContactFormEventHandlers {
	onFieldChange?: (field: keyof ContactFormData, value: string) => void;
	onFieldBlur?: (field: keyof ContactFormData) => void;
	onFieldFocus?: (field: keyof ContactFormData) => void;
	onValidationChange?: (result: FormValidationResult) => void;
	onSubmit?: (data: ContactFormData) => Promise<ContactFormResponse>;
	onSubmitSuccess?: (response: ContactFormResponse) => void;
	onSubmitError?: (error: Error) => void;
	onReset?: () => void;
}

/**
 * Contact form store state (for Svelte stores)
 */
export interface ContactFormStore {
	// State
	data: ContactFormData;
	errors: ContactFormErrors;
	isSubmitting: boolean;
	isSubmitted: boolean;
	hasError: boolean;
	config: ContactFormConfig;

	// Actions
	updateField: (field: keyof ContactFormData, value: string) => void;
	validateField: (field: keyof ContactFormData) => FieldValidationResult;
	validateForm: () => FormValidationResult;
	submitForm: () => Promise<ContactFormResponse>;
	resetForm: () => void;
	clearErrors: () => void;
}

/**
 * Contact section props (for Svelte component)
 */
export interface ContactSectionProps {
	config?: Partial<ContactSectionConfig>;
	theme?: Partial<ContactThemeConfig>;
	formConfig?: Partial<ContactFormConfig>;
	eventHandlers?: Partial<ContactFormEventHandlers>;
	className?: string;
	id?: string;
}

/**
 * Default validation patterns
 */
export const DEFAULT_VALIDATION_PATTERNS = {
	email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
	phone: /^[\+]?[1-9][\d]{0,15}$/,
	name: /^[a-zA-Z\s\-'\.]{2,50}$/
} as const;

/**
 * Default form configuration
 */
export const DEFAULT_FORM_CONFIG: ContactFormConfig = {
	validation: {
		name: {
			required: true,
			minLength: 2,
			maxLength: 50
		},
		email: {
			required: true,
			pattern: DEFAULT_VALIDATION_PATTERNS.email
		},
		message: {
			required: true,
			minLength: 10,
			maxLength: 1000
		}
	},
	autoResetOnSuccess: true,
	showLoadingState: true,
	enableSpamProtection: true,
	maxSubmissionRate: 3 // 3 submissions per minute
};

/**
 * Type guard for ContactFormData
 */
export function isContactFormData(obj: unknown): obj is ContactFormData {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'name' in obj &&
		'email' in obj &&
		'message' in obj &&
		typeof (obj as ContactFormData).name === 'string' &&
		typeof (obj as ContactFormData).email === 'string' &&
		typeof (obj as ContactFormData).message === 'string'
	);
}

/**
 * Type guard for ContactFormResponse
 */
export function isContactFormResponse(obj: unknown): obj is ContactFormResponse {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'success' in obj &&
		'message' in obj &&
		typeof (obj as ContactFormResponse).success === 'boolean' &&
		typeof (obj as ContactFormResponse).message === 'string'
	);
}
