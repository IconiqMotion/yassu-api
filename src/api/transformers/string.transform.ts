export const EmptyStringToNullTransform = (value): number | string => {
	if (!value) {
		return null;
	}
};
