"use client";

import { useCallback, useEffect, useRef } from "react";

type NutrientViewerWindow = Window & {
  NutrientViewer?: {
    load: (config: unknown) => Promise<unknown>;
    unload?: (container: HTMLElement) => void;
    defaultToolbarItems?: Array<{ type: string }>;
  };
};

interface ViewerProps {
  document: string | ArrayBuffer;
}

interface PatientData {
  patient: {
    firstName: string;
    lastName: string;
    middleName: string;
    dateOfBirth: string;
    ssn: string;
    gender: string;
    maritalStatus: string;
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    employer: string;
    occupation: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  insurance: {
    primary: {
      company: string;
      policyNumber: string;
      groupNumber: string;
      subscriberName: string;
      subscriberDOB: string;
      relationship: string;
    };
    secondary: {
      company: string;
      policyNumber: string;
      groupNumber: string;
      subscriberName: string;
      subscriberDOB: string;
      relationship: string;
    };
  };
  medicalHistory: {
    allergies: string[];
    medications: string[];
    conditions: string[];
    surgeries: string[];
    familyHistory: string[];
  };
}

interface ViewerInstance {
  getFormFieldValues: () => Promise<Record<string, unknown>>;
  setFormFieldValues: (values: Record<string, string | string[]>) => void;
}

export default function Viewer({ document }: ViewerProps) {
  const containerRef = useRef(null);

  const getFormFieldValues = useCallback(
    async (
      availableFields: string[],
      _documentName: string,
    ): Promise<Record<string, string | string[]>> => {
      try {
        const response = await fetch("/patient-intake/data/patient-data.json");
        const data: PatientData = await response.json();

        // Helper function to find field names that end with a specific suffix
        const findFieldByEnding = (suffix: string): string | undefined => {
          return availableFields.find((field) => field.endsWith(`_${suffix}`));
        };

        // Create a mapping of potential field names to data values
        const dataMapping: Record<string, string | string[]> = {
          // Patient Demographics - with SDK prefixes (format: fieldName_originalName)
          firstName_firstName: data.patient.firstName,
          lastName_lastName: data.patient.lastName,
          middleName_middleName: data.patient.middleName,
          dateOfBirth_dateOfBirth: data.patient.dateOfBirth,
          ssn_ssn: data.patient.ssn,
          phone_phone: data.patient.phone,
          email_email: data.patient.email,
          address_address: data.patient.address.street,
          city_city: data.patient.address.city,
          state_state: data.patient.address.state,
          zipCode_zipCode: data.patient.address.zipCode,
          employer_employer: data.patient.employer,
          occupation_occupation: data.patient.occupation,

          // Gender checkboxes (with SDK prefixes) - using ["Yes"] to check, [] to uncheck
          genderFemale_gender: data.patient.gender === "Female" ? ["Yes"] : [],
          genderMale_gender: data.patient.gender === "Male" ? ["Yes"] : [],
          genderOther_gender: [],
          genderPreferNot_gender: [],

          // Marital status checkboxes (with SDK prefixes) - using ["Yes"] to check, [] to uncheck
          maritalSingle_maritalStatus:
            data.patient.maritalStatus === "Single" ? ["Yes"] : [],
          maritalMarried_maritalStatus:
            data.patient.maritalStatus === "Married" ? ["Yes"] : [],
          maritalDivorced_maritalStatus:
            data.patient.maritalStatus === "Divorced" ? ["Yes"] : [],
          maritalWidowed_maritalStatus:
            data.patient.maritalStatus === "Widowed" ? ["Yes"] : [],

          // Signature fields removed - will be converted to electronic signature fields
          // But pre-fill signature date fields with today's date
          signatureDate_signatureDate: new Date().toLocaleDateString("en-US"),

          // Emergency Contact (with SDK prefixes - will be used when emergency contact form is loaded)
          emergencyName_emergencyName: data.emergencyContact.name,
          relationship_relationship: data.emergencyContact.relationship,
          emergencyPhone_emergencyPhone: data.emergencyContact.phone,
          emergencyPhone2_emergencyPhone2: "", // Secondary phone, typically empty
          emergencyEmail_emergencyEmail: data.patient.email, // Use patient email as fallback
          emergencyAddress_emergencyAddress:
            data.emergencyContact.address.street,
          emergencyCity_emergencyCity: data.emergencyContact.address.city,
          emergencyState_emergencyState: data.emergencyContact.address.state,
          emergencyZip_emergencyZip: data.emergencyContact.address.zipCode,

          // Second emergency contact (typically empty)
          emergency2Name_emergency2Name: "",
          relationship2_relationship2: "",
          emergency2Phone_emergency2Phone: "",

          // Decision maker
          decisionMaker_decisionMaker: data.emergencyContact.name,
          decisionMakerRelation_decisionMakerRelation:
            data.emergencyContact.relationship,
          decisionMakerPhone_decisionMakerPhone: data.emergencyContact.phone,

          // Insurance Primary (with SDK prefixes - will be used when insurance form is loaded)
          primaryInsurance_primaryInsurance: data.insurance.primary.company,
          primaryPolicy_primaryPolicy: data.insurance.primary.policyNumber,
          primaryGroup_primaryGroup: data.insurance.primary.groupNumber,
          primarySubscriber_primarySubscriber:
            data.insurance.primary.subscriberName,
          primarySubscriberDOB_primarySubscriberDOB:
            data.insurance.primary.subscriberDOB,
          primarySelf_primaryRelationship:
            data.insurance.primary.relationship === "Self" ? ["Yes"] : [],
          primarySpouse_primaryRelationship:
            data.insurance.primary.relationship === "Spouse" ? ["Yes"] : [],

          // Insurance Secondary (with SDK prefixes - will be used when insurance form is loaded)
          secondaryInsurance_secondaryInsurance:
            data.insurance.secondary.company,
          secondaryPolicy_secondaryPolicy:
            data.insurance.secondary.policyNumber,
          secondaryGroup_secondaryGroup: data.insurance.secondary.groupNumber,
          secondarySubscriber_secondarySubscriber:
            data.insurance.secondary.subscriberName,
          secondarySubscriberDOB_secondarySubscriberDOB:
            data.insurance.secondary.subscriberDOB,
          secondarySelf_secondaryRelationship:
            data.insurance.secondary.relationship === "Self" ? ["Yes"] : [],
          secondarySpouse_secondaryRelationship:
            data.insurance.secondary.relationship === "Spouse" ? ["Yes"] : [],

          // HIPAA Authorization (with SDK prefixes - will be used when HIPAA form is loaded)
          patientName_patientName: `${data.patient.firstName} ${data.patient.middleName} ${data.patient.lastName}`,
          patientDOB_patientDOB: data.patient.dateOfBirth,
          authorizedPersons_authorizedPersons: `${data.emergencyContact.name} - ${data.emergencyContact.relationship}`,

          // Pre-check common authorizations (with SDK prefixes) - using ["Yes"] to check
          authTreatment_authTreatment: ["Yes"],
          authPayment_authPayment: ["Yes"],
          authOperations_authOperations: ["Yes"],
          disclosureInsurance_disclosureInsurance: ["Yes"],
          disclosureProviders_disclosureProviders: ["Yes"],
          disclosureFamily_disclosureFamily: ["Yes"],
          expiresEndTreatment_expiresEndTreatment: ["Yes"],
          commPhone_commPhone: ["Yes"],
          commEmail_commEmail: ["Yes"],
          voicemailOk_voicemailOk: ["Yes"],

          // Financial Responsibility (with SDK prefixes - will be used when financial form is loaded)
          responsibleParty_responsibleParty: `${data.patient.firstName} ${data.patient.middleName} ${data.patient.lastName}`,
          staffDate_staffDate: new Date().toLocaleDateString("en-US"), // Date field for staff signature

          // Pre-check agreements (with SDK prefixes) - using ["Yes"] to check
          agreeInsurance_agreeInsurance: ["Yes"],
          agreePayment_agreePayment: ["Yes"],
          agreeAppointment_agreeAppointment: ["Yes"],
          paymentCash_paymentCash: ["Yes"],
          paymentCheck_paymentCheck: ["Yes"],
          paymentCredit_paymentCredit: ["Yes"],

          // Medical History (dynamically mapped based on available fields)
          // Note: Field names now have hash prefixes like id_[hash]_medicationName1
        };

        // Add medical history fields dynamically based on available fields
        const medicalMappings: Record<string, string> = {};

        // Medications
        const med1Name = findFieldByEnding("medicationName1");
        const med1Purpose = findFieldByEnding("medicationPurpose1");
        const med2Name = findFieldByEnding("medicationName2");
        const med2Purpose = findFieldByEnding("medicationPurpose2");
        const med3Name = findFieldByEnding("medicationName3");
        const med3Purpose = findFieldByEnding("medicationPurpose3");

        if (med1Name)
          medicalMappings[med1Name] =
            data.medicalHistory.medications[0]?.split(" - ")[0] || "";
        if (med1Purpose)
          medicalMappings[med1Purpose] =
            data.medicalHistory.medications[0]?.split(" - ")[1] || "";
        if (med2Name)
          medicalMappings[med2Name] =
            data.medicalHistory.medications[1]?.split(" - ")[0] || "";
        if (med2Purpose)
          medicalMappings[med2Purpose] =
            data.medicalHistory.medications[1]?.split(" - ")[1] || "";
        if (med3Name)
          medicalMappings[med3Name] =
            data.medicalHistory.medications[2]?.split(" - ")[0] || "";
        if (med3Purpose)
          medicalMappings[med3Purpose] =
            data.medicalHistory.medications[2]?.split(" - ")[1] || "";

        // Allergies
        const allergen1 = findFieldByEnding("allergen1");
        const reaction1 = findFieldByEnding("reaction1");
        const allergen2 = findFieldByEnding("allergen2");
        const reaction2 = findFieldByEnding("reaction2");
        const allergen3 = findFieldByEnding("allergen3");
        const reaction3 = findFieldByEnding("reaction3");

        if (allergen1)
          medicalMappings[allergen1] =
            data.medicalHistory.allergies[0]?.split(" - ")[0] || "";
        if (reaction1)
          medicalMappings[reaction1] =
            data.medicalHistory.allergies[0]?.split(" - ")[1] || "";
        if (allergen2)
          medicalMappings[allergen2] =
            data.medicalHistory.allergies[1]?.split(" - ")[0] || "";
        if (reaction2)
          medicalMappings[reaction2] =
            data.medicalHistory.allergies[1]?.split(" - ")[1] || "";
        if (allergen3)
          medicalMappings[allergen3] =
            data.medicalHistory.allergies[2]?.split(" - ")[0] || "";
        if (reaction3)
          medicalMappings[reaction3] =
            data.medicalHistory.allergies[2]?.split(" - ")[1] || "";

        // Medical Conditions
        const condition1 = findFieldByEnding("condition1");
        const conditionYear1 = findFieldByEnding("conditionYear1");
        const condition2 = findFieldByEnding("condition2");
        const conditionYear2 = findFieldByEnding("conditionYear2");
        const condition3 = findFieldByEnding("condition3");
        const conditionYear3 = findFieldByEnding("conditionYear3");

        if (condition1)
          medicalMappings[condition1] =
            data.medicalHistory.conditions[0]?.split(" - ")[0] || "";
        if (conditionYear1)
          medicalMappings[conditionYear1] =
            data.medicalHistory.conditions[0]?.includes(" - ")
              ? data.medicalHistory.conditions[0]
                  .split(" - ")[1]
                  ?.replace("diagnosed ", "")
              : "";
        if (condition2)
          medicalMappings[condition2] =
            data.medicalHistory.conditions[1]?.split(" - ")[0] || "";
        if (conditionYear2)
          medicalMappings[conditionYear2] =
            data.medicalHistory.conditions[1]?.includes(" - ")
              ? data.medicalHistory.conditions[1]
                  .split(" - ")[1]
                  ?.replace("diagnosed ", "")
              : "";
        if (condition3)
          medicalMappings[condition3] =
            data.medicalHistory.conditions[2]?.split(" - ")[0] || "";
        if (conditionYear3)
          medicalMappings[conditionYear3] =
            data.medicalHistory.conditions[2]?.includes(" - ")
              ? data.medicalHistory.conditions[2]
                  .split(" - ")[1]
                  ?.replace("diagnosed ", "")
              : "";

        // Family History
        const familyHistory = findFieldByEnding("familyHistory");
        if (familyHistory)
          medicalMappings[familyHistory] =
            data.medicalHistory.familyHistory.join("\n") || "";

        // Combine dataMapping and medicalMappings
        const combinedMapping = { ...dataMapping, ...medicalMappings };

        // Only include fields that actually exist in the PDF
        const formFields: Record<string, string | string[]> = {};
        availableFields.forEach((fieldName) => {
          if (Object.hasOwn(combinedMapping, fieldName)) {
            formFields[fieldName] = combinedMapping[fieldName];
          }
        });

        return formFields;
      } catch (error) {
        console.error("Error loading patient data:", error);
        return {};
      }
    },
    [],
  );

  useEffect(() => {
    const container = containerRef.current;

    const { NutrientViewer } = window as NutrientViewerWindow;
    if (container && NutrientViewer) {
      NutrientViewer.load({
        container,
        document: document,
        toolbarItems: NutrientViewer.defaultToolbarItems?.filter(
          (item: { type: string }) =>
            [
              // Pagination
              "previous-page",
              "next-page",
              "pager",
              "page-jump",
              // Zoom
              "zoom-out",
              "zoom-in",
              "zoom-mode",
            ].includes(item.type),
        ),
      })
        .catch((error: Error) => {
          console.error("❌ Failed to load NutrientViewer:", error);
        })
        .then(async (instance) => {
          if (!instance) {
            console.error("❌ No instance returned from NutrientViewer.load()");
            return;
          }

          // Pre-populate form fields with patient data
          try {
            // First, get all available form fields in this PDF
            const currentValues = await (
              instance as ViewerInstance
            ).getFormFieldValues();
            const availableFields = Object.keys(currentValues);

            // Get the document name for logging
            const documentName =
              typeof document === "string"
                ? document.split("/").pop() || "Unknown"
                : "ArrayBuffer";

            // Only populate fields that exist in this PDF
            const formFieldValues = await getFormFieldValues(
              availableFields,
              documentName,
            );

            if (Object.keys(formFieldValues).length > 0) {
              try {
                // Separate radio button groups from other fields
                const genderFields = Object.fromEntries(
                  Object.entries(formFieldValues).filter(([key]) =>
                    key.includes("gender"),
                  ),
                );
                const relationshipFields = Object.fromEntries(
                  Object.entries(formFieldValues).filter(
                    ([key]) =>
                      key.includes("primarySelf_primaryRelationship") ||
                      key.includes("primarySpouse_primaryRelationship") ||
                      key.includes("secondarySelf_secondaryRelationship") ||
                      key.includes("secondarySpouse_secondaryRelationship"),
                  ),
                );
                const regularFields = Object.fromEntries(
                  Object.entries(formFieldValues).filter(
                    ([key]) =>
                      !key.includes("gender") &&
                      !key.includes("primarySelf_primaryRelationship") &&
                      !key.includes("primarySpouse_primaryRelationship") &&
                      !key.includes("secondarySelf_secondaryRelationship") &&
                      !key.includes("secondarySpouse_secondaryRelationship"),
                  ),
                );

                // Set regular fields first (text fields and other non-radio-button fields)
                await (instance as ViewerInstance).setFormFieldValues(
                  regularFields,
                );

                // Only process gender fields if they exist in this PDF
                if (Object.keys(genderFields).length > 0) {
                  // Check if any gender fields actually exist in the current PDF
                  const actualGenderFields = Object.keys(genderFields).filter(
                    (field) => availableFields.includes(field),
                  );

                  if (actualGenderFields.length > 0) {
                    // Clear all gender checkboxes first, then set only the selected one
                    const allGenderFields = [
                      "genderFemale_gender",
                      "genderMale_gender",
                      "genderOther_gender",
                      "genderPreferNot_gender",
                    ];
                    const clearGenderFields: Record<string, string[]> = {};
                    allGenderFields.forEach((field) => {
                      if (availableFields.includes(field)) {
                        clearGenderFields[field] = [];
                      }
                    });

                    if (Object.keys(clearGenderFields).length > 0) {
                      await (instance as ViewerInstance).setFormFieldValues(
                        clearGenderFields,
                      );

                      // Now set only the selected gender checkbox
                      const selectedGender = Object.entries(genderFields).find(
                        ([key, value]) =>
                          Array.isArray(value) &&
                          value.length > 0 &&
                          availableFields.includes(key),
                      );

                      if (selectedGender) {
                        const [fieldName, value] = selectedGender;
                        await (instance as ViewerInstance).setFormFieldValues({
                          [fieldName]: value,
                        });
                      }
                    }
                  }
                }

                // Process relationship fields (insurance relationship checkboxes)
                if (Object.keys(relationshipFields).length > 0) {
                  // Check if any relationship fields actually exist in the current PDF
                  const actualRelationshipFields = Object.keys(
                    relationshipFields,
                  ).filter((field) => availableFields.includes(field));

                  if (actualRelationshipFields.length > 0) {
                    // Handle primary insurance relationship (Self/Spouse)
                    const primaryFields = [
                      "primarySelf_primaryRelationship",
                      "primarySpouse_primaryRelationship",
                    ];
                    const primaryRelationshipExists = primaryFields.some(
                      (field) => availableFields.includes(field),
                    );

                    if (primaryRelationshipExists) {
                      // Clear primary relationship checkboxes
                      const clearPrimary: Record<string, string[]> = {};
                      primaryFields.forEach((field) => {
                        if (availableFields.includes(field)) {
                          clearPrimary[field] = [];
                        }
                      });
                      await (instance as ViewerInstance).setFormFieldValues(
                        clearPrimary,
                      );

                      // Set the correct primary relationship
                      const selectedPrimary = Object.entries(
                        relationshipFields,
                      ).find(
                        ([key, value]) =>
                          primaryFields.includes(key) &&
                          Array.isArray(value) &&
                          value.length > 0 &&
                          availableFields.includes(key),
                      );

                      if (selectedPrimary) {
                        const [fieldName, value] = selectedPrimary;
                        await (instance as ViewerInstance).setFormFieldValues({
                          [fieldName]: value,
                        });
                      }
                    }

                    // Handle secondary insurance relationship (Self/Spouse)
                    const secondaryFields = [
                      "secondarySelf_secondaryRelationship",
                      "secondarySpouse_secondaryRelationship",
                    ];
                    const secondaryRelationshipExists = secondaryFields.some(
                      (field) => availableFields.includes(field),
                    );

                    if (secondaryRelationshipExists) {
                      // Clear secondary relationship checkboxes
                      const clearSecondary: Record<string, string[]> = {};
                      secondaryFields.forEach((field) => {
                        if (availableFields.includes(field)) {
                          clearSecondary[field] = [];
                        }
                      });
                      await (instance as ViewerInstance).setFormFieldValues(
                        clearSecondary,
                      );

                      // Set the correct secondary relationship
                      const selectedSecondary = Object.entries(
                        relationshipFields,
                      ).find(
                        ([key, value]) =>
                          secondaryFields.includes(key) &&
                          Array.isArray(value) &&
                          value.length > 0 &&
                          availableFields.includes(key),
                      );

                      if (selectedSecondary) {
                        const [fieldName, value] = selectedSecondary;
                        await (instance as ViewerInstance).setFormFieldValues({
                          [fieldName]: value,
                        });
                      }
                    }
                  }
                }
              } catch (error) {
                console.error("Error setting form field values:", error);

                // Fallback to text fields only
                const textFieldsOnly = Object.fromEntries(
                  Object.entries(formFieldValues).filter(
                    ([, value]) => typeof value === "string",
                  ),
                );

                if (Object.keys(textFieldsOnly).length > 0) {
                  await (instance as ViewerInstance).setFormFieldValues(
                    textFieldsOnly,
                  );
                }
              }
            }
          } catch (error) {
            console.error("Error populating form fields:", error);
          }
        });
    }

    return () => {
      if (NutrientViewer?.unload && container) {
        NutrientViewer.unload(container);
      }
    };
  }, [document, getFormFieldValues]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
