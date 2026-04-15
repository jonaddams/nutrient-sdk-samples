import type { List } from "@nutrient-sdk/viewer";
import type { FieldType, FieldCustomData } from "./types";

/**
 * Helper to create an Immutable.List from a plain array.
 * The SDK uses Immutable.js lists for annotationIds and options.
 */
function makeList<T>(NV: typeof window.NutrientViewer, items: T[]) {
  return new (
    NV!.Immutable.List as unknown as new (items: T[]) => List<T>
  )(items);
}

/**
 * Create a form field + widget annotation pair for any supported field type.
 * Returns a tuple of [WidgetAnnotation, FormField] ready for instance.create().
 */
export function createFormField(
  NV: typeof window.NutrientViewer,
  pageIndex: number,
  boundingBox: InstanceType<typeof NutrientViewer.Geometry.Rect>,
  fieldType: FieldType,
  customData: FieldCustomData,
): [any, any] {
  if (!NV) throw new Error("NutrientViewer not loaded");

  const id = NV.generateInstantId();
  const formFieldName = customData.fieldName;

  const widgetOpts: Record<string, any> = {
    id,
    pageIndex,
    boundingBox,
    formFieldName,
    customData,
  };

  // Date fields get an auto-format JavaScript action
  if (fieldType === "date") {
    widgetOpts.additionalActions = {
      onFormat: new NV.Actions.JavaScriptAction({
        script: 'AFDate_FormatEx("mm/dd/yyyy")',
      }),
    };
  }

  const widget = new NV.Annotations.WidgetAnnotation(widgetOpts);

  let formField: any;

  switch (fieldType) {
    case "signature":
      formField = new NV.FormFields.SignatureFormField({
        name: formFieldName,
        annotationIds: makeList<string>(NV, [id]),
      });
      break;

    case "checkbox":
      formField = new NV.FormFields.CheckBoxFormField({
        name: formFieldName,
        annotationIds: makeList<string>(NV, [id]),
        options: makeList(NV, [
          new NV.FormOption({ label: "Yes", value: "Yes" }),
        ]),
        defaultValues: makeList<string>(NV, []),
      });
      break;

    case "radio":
      formField = new NV.FormFields.RadioButtonFormField({
        name: formFieldName,
        annotationIds: makeList<string>(NV, [id]),
        options: makeList(NV, [
          new NV.FormOption({ label: "Yes", value: "Yes" }),
        ]),
        defaultValues: makeList<string>(NV, []),
      });
      break;

    case "text":
    case "date":
    default:
      formField = new NV.FormFields.TextFormField({
        name: formFieldName,
        annotationIds: makeList<string>(NV, [id]),
      });
      break;
  }

  return [widget, formField];
}
