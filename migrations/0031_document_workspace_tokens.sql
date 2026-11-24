-- Upgrade only exact, unedited system-generated introduction paragraphs.
-- The legacy name appears here solely to recognize stored historical templates.
-- Custom wording, section ordering, client names, numbers and statuses are preserved.
CREATE TABLE __workspace_document_tokens (heading TEXT NOT NULL, body TEXT NOT NULL);
INSERT INTO __workspace_document_tokens (heading, body) VALUES
('Ringkasan kebutuhan', 'Terima kasih telah mempertimbangkan {{workspaceName}} untuk mendukung kebutuhan {{clientName}}. Penawaran ini merangkum layanan, hasil kerja, dan investasi yang dibahas bersama.'),
('Ringkasan penawaran', 'Dengan hormat,
{{workspaceName}} mengajukan penawaran layanan pengelolaan social media bulanan kepada {{clientName}}. Detail pekerjaan, output, dan investasi tercantum pada dokumen ini.'),
('Ringkasan penawaran', 'Dengan hormat,
{{workspaceName}} mengajukan penawaran produksi konten untuk project {{projectName}} kepada {{clientName}}. Detail pekerjaan, output, dan investasi tercantum pada dokumen ini.'),
('Para pihak dan tujuan kerja sama', 'Perjanjian ini dibuat antara {{workspaceName}} dan {{clientName}} untuk layanan yang dijelaskan di bawah ini.'),
('Para pihak dan tujuan kerja sama', 'Perjanjian ini mengatur layanan pengelolaan social media bulanan antara {{workspaceName}} dan {{clientName}}.'),
('Para pihak dan tujuan kerja sama', 'Perjanjian ini mengatur layanan produksi konten {{projectName}} antara {{workspaceName}} dan {{clientName}}.'),
('Summary of Requirements', 'Thank you for considering {{workspaceName}} to support {{clientName}}. This offer outlines the services, deliverables, and investment discussed together.'),
('Offer Summary', 'Dear Client,
{{workspaceName}} is pleased to offer monthly social media management services to {{clientName}}. The scope, deliverables, and investment are outlined in this document.'),
('Offer Summary', 'Dear Client,
{{workspaceName}} is pleased to offer content production for the {{projectName}} project to {{clientName}}. The scope, deliverables, and investment are outlined in this document.'),
('Parties and Purpose of Cooperation', 'This agreement is made between {{workspaceName}} and {{clientName}} for the services described below.'),
('Parties and Purpose of Cooperation', 'This agreement covers monthly social media management services between {{workspaceName}} and {{clientName}}.'),
('Parties and Purpose of Cooperation', 'This agreement covers content production for {{projectName}} between {{workspaceName}} and {{clientName}}.');

UPDATE client_documents AS d
SET sections = (
  SELECT json_group_array(json(COALESCE((
    SELECT json_set(section.value, '$.body',
      replace(template.body, '{{clientName}}', COALESCE(b.name, p.brand_name, 'Prospek')))
    FROM __workspace_document_tokens AS template
    CROSS JOIN (
      SELECT 'Idaman Creative' AS name
      UNION SELECT name FROM workspace_profile WHERE id = 'workspace'
    ) AS agency
    LEFT JOIN brands AS b ON b.id = d.brand_id
    LEFT JOIN prospects AS p ON p.id = d.prospect_id
    WHERE json_extract(section.value, '$.heading') = template.heading
      AND json_extract(section.value, '$.body') =
        replace(replace(template.body, '{{workspaceName}}', agency.name),
          '{{clientName}}', COALESCE(b.name, p.brand_name, 'Prospek'))
    LIMIT 1
  ), section.value)))
  FROM (SELECT value FROM json_each(d.sections) ORDER BY CAST(key AS INTEGER)) AS section
)
WHERE json_valid(sections);

DROP TABLE __workspace_document_tokens;
