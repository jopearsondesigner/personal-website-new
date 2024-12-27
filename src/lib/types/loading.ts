export interface LoadingState {
	isLoading: boolean;
	progress: number;
	assetsLoaded: boolean;
	fontsLoaded: boolean;
	error: string | null;
}

export interface Asset {
	url: string;
	type: 'image' | 'font' | 'other';
	status: 'pending' | 'loaded' | 'error';
}

export type LoadingStoreActions = {
	startLoading: () => void;
	finishLoading: () => void;
	setProgress: (progress: number) => void;
	setError: (error: string) => void;
	reset: () => void;
};

export type LoadingStore = LoadingState & LoadingStoreActions;
