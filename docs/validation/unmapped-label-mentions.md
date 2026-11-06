# Unmapped pairs whose FDA labels mention each other

Checked 2026-11-06 against current drug labels from api.fda.gov/drug/label.json (one single-ingredient label per drug, sections: drug interactions, warnings, precautions, contraindications, clinical pharmacology, adverse reactions, dosage). Searched for the other drug's name, brands and class words.

These are pairs FirstPass does **not** map as a pair finding (no pair finding of kind PK or PD from `analyze()`) but where a label text names the other drug or its class. No engine finding, grade or pin was added or changed. This list is for the owner to review. A mention is not necessarily an interaction (some quotes say no effect was found). The Workup practice lists leave all of these pairs out.

## Warfarin + Metformin

- **Metformin label, drug interactions** (matched "coumarin"): "…other drugs that are highly protein-bound, salicylates, sulfonamides, chloramphenicol, probenecid, coumarins, monoamine oxidase inhibitors, and beta-adrenergic blocking agents. When such drugs are administered to a patient receiving glipiz…"
- **Metformin label, precautions** (matched "coumarin"): "…other drugs that are highly protein-bound, salicylates, sulfonamides, chloramphenicol, probenecid, coumarins, monoamine oxidase inhibitors, and beta-adrenergic blocking agents. When such drugs are administered to a patient receiving glipiz…"

## Metformin + Lisinopril

- **Lisinopril label, drug interactions** (matched "antidiabetic"): "…diuretics. Alcohol, barbiturates, or narcotics - potentiation of orthostatic hypotension may occur. Antidiabetic drugs (oral agents and insulin) - dosage adjustment of the antidiabetic drug may be required. Other antihypertensive drugs - ad…"
- **Lisinopril label, precautions** (matched "antidiabetic"): "…diuretics. Alcohol, barbiturates, or narcotics - potentiation of orthostatic hypotension may occur. Antidiabetic drugs (oral agents and insulin) - dosage adjustment of the antidiabetic drug may be required. Other antihypertensive drugs - ad…"

## Clarithromycin + Metformin

- **Clarithromycin label, drug interactions** (matched "hypoglycemic"): "…s and Precautions ( 5.4 )] Atorvastatin Pravastatin Use With Caution Fluvastatin No Dose Adjustment Hypoglycemic Agents: Nateglinide Pioglitazone Repaglinide Rosiglitazone Use With Caution Nateglinide, Pioglitazone, Repaglinide, Rosiglitazo…"
- **Clarithromycin label, warnings and cautions** (matched "hypoglycemic"): "…t is recommended to prescribe the lowest registered dose if concomitant use cannot be avoided. Oral Hypoglycemic Agents/Insulin: The concomitant use of clarithromycin tablets and oral hypoglycemic agents and/or insulin can result in signifi…"
- **Clarithromycin label, adverse reactions** (matched "hypoglycemic"): "…hepatic failure. Metabolism and Nutrition : Hypoglycemia has been reported in patients taking oral hypoglycemic agents or insulin. Musculoskeletal and Connective Tissue : Myopathy rhabdomyolysis was reported and in some of the reports, cla…"

## Amlodipine + Metformin

- **Amlodipine label, drug interactions** (matched "antidiabetic"): "…. The antihypertensive effect of ACE inhibitors, including benazepril, may be attenuated by NSAIDs. Antidiabetic Agents: In rare cases, diabetic patients receiving an ACE inhibitor (including benazepril) concomitantly with insulin or oral a…"
- **Metformin label, drug interactions** (matched "calcium channel"): "…nes, thyroid products, estrogens, oral contraceptives, phenytoin, nicotinic acid, sympathomimetics, calcium channel blocking drugs, and isoniazid. When such drugs are administered to a patient receiving glipizide and metformin hydrochloride…"
- **Metformin label, precautions** (matched "calcium channel"): "…nes, thyroid products, estrogens, oral contraceptives, phenytoin, nicotinic acid, sympathomimetics, calcium channel blocking drugs, and isoniazid. When such drugs are administered to a patient receiving glipizide and metformin hydrochloride…"

## Digoxin + Atorvastatin

- **Digoxin label, drug interactions** (matched "atorvastatin"): "…r 50% 85% Tetracycline 100% NA Verapamil 50 - 75% NA Digoxin concentrations increased less than 50% Atorvastatin 22% 15% Measure serum digoxin concentrations before initiating concomitant drugs. Reduce digoxin concentrations by decreasing t…"
- **Atorvastatin label, drug interactions** (matched "digoxin"): "…thindrone and ethinyl estradiol; consider this effect when selecting an oral contraceptive ( 7.5 ). Digoxin: May increase digoxin plasma levels; monitor patients appropriately ( 7.5 ). 7.1 Impact of Other Drugs on Amlodipine CYP3A Inhibitor…"
- **Atorvastatin label, clinical pharmacology** (matched "digoxin"): "…trates. In vitro data indicate that amlodipine has no effect on the human plasma protein binding of digoxin, phenytoin, warfarin, and indomethacin. Co-administered amlodipine does not affect the exposure to atorvastatin, digoxin, ethanol an…"

## Digoxin + Metformin

- **Digoxin label, drug interactions** (matched "metformin"): "…rine, diclofenac, diphenoxylate, epoprostenol, esomeprazole, ibuprofen, ketoconazole, lansoprazole, metformin, omeprazole Measure serum digoxin concentrations before initiating concomitant drugs. Continue monitoring and reduce digoxin dose…"

## Verapamil + Metformin

- **Metformin label, drug interactions** (matched "calcium channel"): "…nes, thyroid products, estrogens, oral contraceptives, phenytoin, nicotinic acid, sympathomimetics, calcium channel blocking drugs, and isoniazid. When such drugs are administered to a patient receiving glipizide and metformin hydrochloride…"
- **Metformin label, precautions** (matched "calcium channel"): "…nes, thyroid products, estrogens, oral contraceptives, phenytoin, nicotinic acid, sympathomimetics, calcium channel blocking drugs, and isoniazid. When such drugs are administered to a patient receiving glipizide and metformin hydrochloride…"

## Tacrolimus + Mycophenolate

- **Tacrolimus label, warnings and cautions** (matched "immunosuppress"): "…s with infections and certain concomitant medications. ( 5.14 ) 5.1 Lymphoma and Other Malignancies Immunosuppressants, including tacrolimus extended-release capsules, increase the risk of developing lymphomas and other malignancies, partic…"
- **Tacrolimus label, clinical pharmacology** (matched "immunosuppress"): "…oxide release, induces apoptosis and production of transforming growth factor-beta that can lead to immunosuppressive activity. The net result is the inhibition of T-lymphocyte activation and proliferation as well as T-helper-cell-dependent…"
- **Tacrolimus label, adverse reactions** (matched "immunosuppress"): "…s extended-release capsules (N=214) or tacrolimus immediate-release product (N=212) and concomitant immunosuppressants (median duration of exposure of 12 months) in a randomized, open-label, active-controlled trial of mostly U.S. patients (…"
- **Tacrolimus label, boxed warning** (matched "immunosuppress"): "…developing serious infections and malignancies with tacrolimus extended-release capsulest or other immunosuppressants that may lead to hospitalization or death. [see Warnings and Precautions ( 5.1 , 5.2 )] Increased mortality in female liv…"
- **Tacrolimus label, dosage and administration** (matched "mycophenolate"): "…ns is recommended. ( 2.4 ) For complete dosing information, see Full Prescribing Information. MMF = Mycophenolate mofetil Recommended Tacrolimus Extended-Release Capsules Initial Dosage Patient Population Initial Oral Dosage Whole Blood Tro…"
- **Tacrolimus label, indications and usage** (matched "immunosuppress"): "…ated for the prophylaxis of organ rejection in kidney transplant patients in combination with other immunosuppressants in adult patients who can swallow capsules intact [see Clinical Studies ( 14.1 ), ( 14.2 )] . Pediatric use information i…"
- **Mycophenolate label, warnings and cautions** (matched "immunosuppress"): "…e Use in Specific Populations (8.1 , 8.3) ]. 5.2 Lymphoma and Other Malignancies Patients receiving immunosuppressants, including mycophenolate mofetil, are at increased risk of developing lymphomas and other malignancies, particularly of t…"
- **Mycophenolate label, adverse reactions** (matched "immunosuppress"): "…9), in combination with cyclosporine (Sandimmune ® or Neoral ® ) and corticosteroids as maintenance immunosuppressive therapy. In the de novo liver transplantation study with 12-month duration, patients received mycophenolate mofetil 1 g tw…"
- **Mycophenolate label, dosage and administration** (matched "immunosuppress"): "…Mycophenolate mofetil should not be used without the supervision of a physician with experience in immunosuppressive therapy. Mycophenolate Mofetil Capsules Mycophenolate mofetil capsules should not be used interchangeably with mycophenoli…"
- **Mycophenolate label, indications and usage** (matched "immunosuppress"): "…cal Studies (14.2) ] or liver transplants [see Clinical Studies (14.3) ], in combination with other immunosuppressants. Mycophenolate Mofetil capsules are an antimetabolite immunosuppressant indicated for the prophylaxis of organ rejection…"

## Fluconazole + Mycophenolate

- **Fluconazole label, drug interactions** (matched "immunosuppress"): "…Amphotericin B : Concurrent administration of fluconazole and amphotericin B in infected normal and immunosuppressed mice showed the following results: a small additive antifungal effect in systemic infection with Candida albicans , no inte…"
- **Fluconazole label, precautions** (matched "immunosuppress"): "…Amphotericin B : Concurrent administration of fluconazole and amphotericin B in infected normal and immunosuppressed mice showed the following results: a small additive antifungal effect in systemic infection with Candida albicans , no inte…"
- **Mycophenolate label, drug interactions** (matched "azole"): "…alterations in efficacy when PPIs are co- administered with mycophenolate mofetil. Examples Lansoprazole, pantoprazole Drugs that Interfere with Enterohepatic Recirculation Clinical Impact Concomitant use with drugs that directly interfere…"
- **Mycophenolate label, clinical pharmacology** (matched "azole"): "…lone under fasting conditions. Proton Pump Inhibitors (PPIs) Coadministration of PPIs (e.g., lansoprazole, pantoprazole) in single doses to healthy volunteers and multiple doses to transplant patients receiving mycophenolate mofetil has bee…"

## Prednisone + Mycophenolate

- **Prednisone label, warnings** (matched "immunosuppress"): "…perthyroid patients. Changes in thyroid status of the patient may necessitate adjustment in dosage. Immunosuppression and Increased Risk of Infection Corticosteroids, including prednisone tablets, suppress the immune system and increase the…"
- **Prednisone label, adverse reactions** (matched "immunosuppress"): "…ation/masking of infections, decreased resistance to infection (see WARNINGS: Infection ), hiccups, immunosuppression, increased or decreased motility and number of spermatozoa, malaise, insomnia, moon face, pyrexia.…"
- **Mycophenolate label, adverse reactions** (matched "corticosteroid"): "…d 289 were included in one cardiac study. Patients in all study arms also received cyclosporine and corticosteroids. The data described below primarily derive from five randomized, active-controlled double-blind 12-month trials of mycopheno…"

## Linezolid + Metformin

- **Linezolid label, warnings and cautions** (matched "hypoglycemic"): "…omatic hypoglycemia have been reported in patients with diabetes mellitus receiving insulin or oral hypoglycemic agents. ( 5.9 ) 5.1 Myelosuppression Myelosuppression (including anemia, leukopenia, pancytopenia, and thrombocytopenia) has be…"
- **Metformin label, drug interactions** (matched "monoamine oxidase"): "…s that are highly protein-bound, salicylates, sulfonamides, chloramphenicol, probenecid, coumarins, monoamine oxidase inhibitors, and beta-adrenergic blocking agents. When such drugs are administered to a patient receiving glipizide and met…"
- **Metformin label, precautions** (matched "monoamine oxidase"): "…s that are highly protein-bound, salicylates, sulfonamides, chloramphenicol, probenecid, coumarins, monoamine oxidase inhibitors, and beta-adrenergic blocking agents. When such drugs are administered to a patient receiving glipizide and met…"

## Sertraline + Metformin

- **Sertraline label, drug interactions** (matched "hypoglycemic"): "…-administered with sertraline hydrochloride (see Drugs Metabolized by P450 2D6 under PRECAUTIONS ). Hypoglycemic Drugs –In a placebo-controlled trial in normal volunteers, administration of sertraline hydrochloride for 22 days (including 20…"
- **Sertraline label, precautions** (matched "hypoglycemic"): "…-administered with sertraline hydrochloride (see Drugs Metabolized by P450 2D6 under PRECAUTIONS ). Hypoglycemic Drugs –In a placebo-controlled trial in normal volunteers, administration of sertraline hydrochloride for 22 days (including 20…"

## Rifampin + Isoniazid

- **Rifampin label, drug interactions** (matched "isoniazid"): "…ONS .) When rifampin is given concomitantly with other hepatotoxic medications such as halothane or isoniazid, the potential for hepatotoxicity is increased. The concomitant use of rifampin and halothane should be avoided. Patients receivin…"
- **Rifampin label, warnings** (matched "antimycobacterial"): "…physical and radiological signs in a patient who had previously shown improvement with appropriate antimycobacterial treatment, in the absence of disease relapse, poor treatment compliance, drug resistance, side effects of treatment, or se…"
- **Rifampin label, precautions** (matched "isoniazid"): "…nal failure. Recent studies indicate that regimens using twice-weekly doses of rifampin 600 mg plus isoniazid 15 mg/kg are much better tolerated. Rifampin is not recommended for intermittent therapy; the patient should be cautioned against…"
- **Rifampin label, dosage and administration** (matched "isoniazid"): "…dicated in the treatment of all forms of tuberculosis. A three-drug regimen consisting of rifampin, isoniazid, and pyrazinamide is recommended in the initial phase of short-course therapy which is usually continued for 2 months. The Advisor…"
- **Rifampin label, indications and usage** (matched "isoniazid"): "…dicated in the treatment of all forms of tuberculosis. A three-drug regimen consisting of rifampin, isoniazid, and pyrazinamide (e.g., RIFATER ® (Sanofi-aventis U.S. LLC)) is recommended in the initial phase of short-course therapy which is…"
- **Isoniazid label, drug interactions** (matched "rifampin"): "…ketoconazole and isoniazid may exist. When ketoconazole is given in combination with isoniazid and rifampin the AUC of ketoconazole is decreased by as much as 88 percent after 5 months of concurrent isoniazid and rifampin therapy 4 . Pheny…"
- **Isoniazid label, precautions** (matched "rifampin"): "…ketoconazole and isoniazid may exist. When ketoconazole is given in combination with isoniazid and rifampin the AUC of ketoconazole is decreased by as much as 88 percent after 5 months of concurrent isoniazid and rifampin therapy 4 . Pheny…"
- **Isoniazid label, dosage and administration** (matched "rifampin"): "…options for the initial treatment of tuberculosis in children and adults: Option 1 Daily isoniazid, rifampin and pyrazinamide for 8 weeks followed by 16 weeks of isoniazid and rifampin daily or 2 to 3 times weekly. Ethambutol or streptomyci…"
- **Isoniazid label, indications and usage** (matched "rifampin"): "…sis or who have pulmonary silicosis should have 12 months of isoniazid or 4 months of isoniazid and rifampin, concomitantly. Intravenous drug users known to be HIV-seronegative (greater than 10 mm). Persons with the following medical condit…"

## Rifampin + Pyridoxine

- **Rifampin label, drug interactions** (matched "pyridoxine"): "…including rifampin (600 mg/day), isoniazid (300 mg/day), pyrazinamide (500 mg 3 x per day), and the pyridoxine (25 mg) was associated with higher than expected doses of nortriptyline were required to obtain a therapeutic drug level. Followi…"
- **Rifampin label, precautions** (matched "pyridoxine"): "…including rifampin (600 mg/day), isoniazid (300 mg/day), pyrazinamide (500 mg 3 x per day), and the pyridoxine (25 mg) was associated with higher than expected doses of nortriptyline were required to obtain a therapeutic drug level. Followi…"

## Isoniazid + Pyridoxine

- **Isoniazid label, clinical pharmacology** (matched "pyridoxine"): "…etylation may lead to higher blood levels of the drug and, thus, to an increase in toxic reactions. Pyridoxine (vitamin B6) deficiency is sometimes observed in adults with high doses of isoniazid and is considered probably due to its compet…"
- **Isoniazid label, adverse reactions** (matched "pyridoxine"): "…drug reaction with eosinophilia syndrome (DRESS) (see WARNINGS ). Metabolic and Endocrine Reactions Pyridoxine deficiency, pellagra, hyperglycemia, metabolic acidosis and gynecomastia. Miscellaneous Reactions Rheumatic syndrome and systemic…"
- **Isoniazid label, dosage and administration** (matched "pyridoxine"): "…isoniazid test strips are also available to check patient compliance. Concomitant administration of pyridoxine (B 6 ) is recommended in the malnourished and in those predisposed to neuropathy (e.g., alcoholics and diabetics).…"

## Ibuprofen + Metformin

- **Ibuprofen label, adverse reactions** (matched "hypoglycemic"): "…Bleeding episodes (eg epistaxis, menorrhagia) METABOLIC/ENDOCRINE Decreased appetite Gynecomastia, hypoglycemic reaction, acidosis CARDIOVASCULAR Edema, fluid retention (generally responds promptly to drug discontinuation) (see PRECAUTIONS…"
- **Metformin label, drug interactions** (matched "ibuprofen"): "…netics. In healthy volunteers, the pharmacokinetics of metformin and propranolol, and metformin and ibuprofen were not affected when coadministered in single-dose interaction studies. Metformin is negligibly bound to plasma proteins and is,…"
- **Metformin label, precautions** (matched "ibuprofen"): "…netics. In healthy volunteers, the pharmacokinetics of metformin and propranolol, and metformin and ibuprofen were not affected when coadministered in single-dose interaction studies. Metformin is negligibly bound to plasma proteins and is,…"

## Methotrexate + Folic acid

- **Methotrexate label, drug interactions** (matched "folic acid"): "…exate. Consider alternative therapies in patients who have received prior nitrous oxide anesthesia. Folic Acid Coadministration of methotrexate with folic acid or its derivatives decreases the clinical effectiveness of methotrexate in patie…"
- **Methotrexate label, warnings and cautions** (matched "folic acid"): "…ivers to take the recommended dosage as directed, because medication errors have led to death. 5.10 Folic Acid Supplementation Neoplastic Diseases Products containing folic acid or its derivatives may decrease the clinical effectiveness of…"
- **Methotrexate label, clinical pharmacology** (matched "folic acid"): "…12 CLINICAL PHARMACOLOGY 12.1 Mechanism of Action Methotrexate inhibits dihydrofolic acid reductase. Dihydrofolates must be reduced to tetrahydrofolates by this enzyme before they can be utilized as carriers of one-carb…"
- **Methotrexate label, dosage and administration** (matched "folic acid"): "…f treatment; however, responses have occurred up to 12 weeks after treatment initiation. Administer folic acid or folinic acid to reduce the risk of methotrexate adverse reactions [see Warnings and Precautions (5.10) ]. 2.4 Recommended Dosa…"
- **Methotrexate label, indications and usage** (matched "folate"): "…1 INDICATIONS AND USAGE Methotrexate tablets are a dihydrofolate reductase inhibitor indicated for the: • Treatment of adults and pediatric patients with acute lymphoblastic leukemia (ALL) as part o…"

## Methotrexate + Omeprazole

- **Methotrexate label, drug interactions** (matched "proton pump"): "…and sulfonamides) • Aspirin and other nonsteroidal anti-inflammatory drugs • Hepatotoxic products • Proton pump inhibitors • Weak acids (e.g., salicylates) • Nephrotoxic products Nitrous Oxide Coadministration of methotrexate with nitrous o…"
- **Omeprazole label, drug interactions** (matched "methotrexate"): "…meprazole levels ( 7.3 ) • Tacrolimus: Omeprazole may increase serum levels of tacrolimus ( 7.4 ) • Methotrexate: Omeprazole may increase serum levels of methotrexate ( 7.7 ) 7.1 Interference with Antiretroviral Therapy Concomitant use of a…"
- **Omeprazole label, warnings and cautions** (matched "methotrexate"): "…sed for testing, as reference ranges between tests may vary. 5.9 Concomitant use of Omeprazole with Methotrexate Literature suggests that concomitant use of PPIs with methotrexate (primarily at high dose; see methotrexate prescribing inform…"

## Oxycodone + Acetaminophen

- **Oxycodone label, dosage and administration** (matched "acetaminophen"): "…y in patients who have disease states that are changing rapidly. Conversion from Fixed-Ratio Opioid/Acetaminophen, Opioid/Aspirin, or Opioid/Nonsteroidal Combination Drugs When converting patients from fixed ratio opioid/non-opioid drug reg…"

## Levothyroxine + Omeprazole

- **Levothyroxine label, drug interactions** (matched "proton pump"): "…dminister levothyroxine sodium tablets at least 4 hours prior to these drugs or monitor TSH levels. Proton Pump Inhibitors Sucralfate Antacids (e.g., aluminum & magnesium hydroxides, simethicone) Gastric acidity is an essential requirement…"
- **Omeprazole label, clinical pharmacology** (matched "thyroid hormone"): "…o 4 weeks, had no effect on thyroid function, carbohydrate metabolism, or circulating levels of parathyroid hormone, cortisol, estradiol, testosterone, prolactin, cholecystokinin or secretin. No effect on gastric emptying of the solid and l…"

## Levothyroxine + Metformin

- **Levothyroxine label, drug interactions** (matched "antidiabetic"): "…(increase in serum free-T4, and decreased or normal free-T3) in clinically euthyroid patients. 7.2 Antidiabetic Therapy Addition of levothyroxine sodium therapy in patients with diabetes mellitus may worsen glycemic control and result in i…"
- **Levothyroxine label, warnings and cautions** (matched "antidiabetic"): "…rol: Therapy in patients with diabetes mellitus may worsen glycemic control and result in increased antidiabetic agent or insulin requirements. Carefully monitor glycemic control after starting, changing, or discontinuing thyroid hormone th…"
- **Metformin label, drug interactions** (matched "thyroid"): "…lucose control. These drugs include thiazides and other diuretics, corticosteroids, phenothiazines, thyroid products, estrogens, oral contraceptives, phenytoin, nicotinic acid, sympathomimetics, calcium channel blocking drugs, and isoniazid…"
- **Metformin label, precautions** (matched "thyroid"): "…lucose control. These drugs include thiazides and other diuretics, corticosteroids, phenothiazines, thyroid products, estrogens, oral contraceptives, phenytoin, nicotinic acid, sympathomimetics, calcium channel blocking drugs, and isoniazid…"

## Calcium supplement + Omeprazole


## Calcium supplement + Metformin

- **Metformin label, drug interactions** (matched "calcium"): "…nes, thyroid products, estrogens, oral contraceptives, phenytoin, nicotinic acid, sympathomimetics, calcium channel blocking drugs, and isoniazid. When such drugs are administered to a patient receiving glipizide and metformin hydrochloride…"
- **Metformin label, precautions** (matched "calcium"): "…d (see PRECAUTIONS , Laboratory Tests ). Certain individuals (those with inadequate vitamin B 12 or calcium intake or absorption) appear to be predisposed to developing subnormal vitamin B 12 levels. In these patients, routine serum vitamin…"

## Phenytoin + Folic acid

- **Phenytoin label, drug interactions** (matched "folic acid"): "…vir Antiepileptic drugs Carbamazepine, vigabatrin Other Chronic alcohol abuse, diazepam, diazoxide, folic acid, reserpine, rifampin, St. John's wort The induction potency of St. John's wort may vary widely based on preparation. , sucralfate…"
- **Phenytoin label, adverse reactions** (matched "folic acid"): "…ion. While macrocytosis and megaloblastic anemia have occurred, these conditions usually respond to folic acid therapy. Lymphadenopathy including benign lymph node hyperplasia, pseudolymphoma, lymphoma, and Hodgkin's disease have been repor…"

## Valproate + Folic acid

- **Valproate label, warnings and cautions** (matched "folic acid"): "…ong babies born to epileptic mothers using other anti-seizure monotherapies. Evidence suggests that folic acid supplementation prior to conception and during the first trimester of pregnancy decreases the risk for congenital neural tube def…"
- **Valproate label, adverse reactions** (matched "folate"): "…gic : Relative lymphocytosis, macrocytosis, leucopenia, anemia including macrocytic with or without folate deficiency, bone marrow suppression, pancytopenia, aplastic anemia, agranulocytosis, and acute intermittent porphyria. Endocrine : Ir…"

## Sildenafil + Metformin

- **Sildenafil label, adverse reactions** (matched "hypoglycemic"): "…utritional: thirst, edema, gout, unstable diabetes, hyperglycemia, peripheral edema, hyperuricemia, hypoglycemic reaction, hypernatremia. Musculoskeletal : arthritis, arthrosis, myalgia, tendon rupture, tenosynovitis, bone pain, myasthenia,…"

## Sildenafil + Lisinopril

- **Sildenafil label, clinical pharmacology** (matched "ace inhibitor"): "…elective serotonin reuptake inhibitors, tricyclic antidepressants), thiazide and related diuretics, ACE inhibitors, and calcium channel blockers. The AUC of the active metabolite, N-desmethyl sildenafil, was increased 62% by loop and potass…"

## Nitroglycerin + Lisinopril

- **Lisinopril label, drug interactions** (matched "nitrate"): "…with renal impairment (GFR < 60 mL/min). Other Agents: Lisinopril has been used concomitantly with nitrates and/or digoxin without evidence of clinically significant adverse interactions. No meaningful clinically important pharmacokinetic…"
- **Lisinopril label, precautions** (matched "nitrate"): "…with renal impairment (GFR < 60 mL/min). Other Agents: Lisinopril has been used concomitantly with nitrates and/or digoxin without evidence of clinically significant adverse interactions. No meaningful clinically important pharmacokinetic…"

## Warfarin + Montelukast

- **Warfarin label, drug interactions** (matched "montelukast"): "…opanolamine, propafenone, propranolol, terbinafine, thiabendazole, ticlopidine, verapamil, zileuton montelukast, moricizine, omeprazole, phenobarbital, phenytoin, cigarette smoking CYP3A4 alprazolam, amiodarone, amlodipine, amprenavir, apre…"
- **Montelukast label, drug interactions** (matched "warfarin"): "…dministered with theophylline, prednisone, prednisolone, oral contraceptives, terfenadine, digoxin, warfarin, gemfibrozil, itraconazole, thyroid hormones, sedative hypnotics, non-steroidal anti-inflammatory agents, benzodiazepines, deconges…"
- **Montelukast label, clinical pharmacology** (matched "warfarin"): "…either oral prednisone or intravenous prednisolone. Oral Contraceptives, Terfenadine, Digoxin, and Warfarin : In drug interaction studies, the recommended clinical dose of montelukast did not have clinically important effects on the pharma…"

## Ibuprofen + Montelukast

- **Montelukast label, drug interactions** (matched "anti-inflammatory"): "…, digoxin, warfarin, gemfibrozil, itraconazole, thyroid hormones, sedative hypnotics, non-steroidal anti-inflammatory agents, benzodiazepines, decongestants, and Cytochrome P450 (CYP) enzyme inducers [see Clinical Pharmacology ( 12.3 )] .…"
- **Montelukast label, warnings and cautions** (matched "anti-inflammatory"): "…5.3 ). • Patients with known aspirin sensitivity should continue to avoid aspirin or non-steroidal anti-inflammatory agents while taking montelukast sodium ( 5.4 ). • Systemic eosinophilia, sometimes presenting with clinical features of va…"
- **Montelukast label, clinical pharmacology** (matched "anti-inflammatory"): "…me or the International Normalized Ratio (INR). Thyroid Hormones, Sedative Hypnotics, Non-Steroidal Anti-Inflammatory Agents, Benzodiazepines, and Decongestants : Although additional specific interaction studies were not performed, monteluk…"

## Warfarin + Famotidine

- **Warfarin label, drug interactions** (matched "famotidine"): "…rifampin CYP1A2 acyclovir, allopurinol, caffeine, cimetidine, ciprofloxacin, disulfiram, enoxacin, famotidine, fluvoxamine, methoxsalen, mexiletine, norfloxacin, oral contraceptives, phenylpropanolamine, propafenone, propranolol, terbinafi…"

## Fluconazole + Famotidine

- **Famotidine label, drug interactions** (matched "azole"): "…gastric pH for absorption for administration instructions, including atazanavir, erlotinib, ketoconazole, itraconazole, ledipasvir/sofosbuvir, nilotinib, and rilpivirine. 7.2 Tizanidine (CYP1A2 Substrate) Although not studied clinically, f…"

