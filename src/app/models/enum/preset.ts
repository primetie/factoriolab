import { SelectItem } from 'primeng/api';

import { Flag } from '../flags';

export enum Preset {
  Minimum = 0,
  Modules = 1,
  Beacon8 = 2,
  Beacon12 = 3,
}

export function presetOptions(flags: Set<Flag>): SelectItem<Preset>[] {
  const options: SelectItem<Preset>[] = [
    { value: Preset.Minimum, label: 'options.preset.minimum' },
    { value: Preset.Modules, label: 'options.preset.upgraded' },
  ];

  if (flags.has('beacons')) {
    options[1].label = 'options.preset.modules';
    options.push(
      { value: Preset.Beacon8, label: 'options.preset.beacon8' },
      { value: Preset.Beacon12, label: 'options.preset.beacon12' },
    );
  }

  if (flags.has('proliferator')) {
    options.push({
      value: Preset.Beacon8,
      label: 'options.preset.proliferated',
    });
  }

  return options;
}
