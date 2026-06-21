export const IntTransform = (value): number => {
	if (value || value === 0) {
		return parseInt(value.toString());
	}
};

export const FloatTransform = (value): number => {
	if (value || value === 0) {
		return parseFloat(value.toString());
	}
};

