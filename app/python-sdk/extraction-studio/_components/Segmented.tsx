"use client";

interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. Required, not optional: this control
   *  renders role="group", and an unnamed group is what a screen-reader user
   *  meets as "group" with no indication of what it switches. Three of these
   *  render in the studio at once. Making it required is what forces every
   *  call site to answer the question. */
  label: string;
}

/** Generic over the option value so a union survives the round trip.
 *
 *  Was `value: string`, which meant every call site feeding a union had to
 *  cast on the way back out (`v as OcrColorMode`) — and a typo in an `options`
 *  value then typechecked and silently fell through to a default. The cast is
 *  the bug, not the boilerplate. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedProps<T>) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> would need a <legend>, which is a visible element this control does not have room for; role="group" plus aria-label is the standard accessible pattern for a segmented button group.
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
