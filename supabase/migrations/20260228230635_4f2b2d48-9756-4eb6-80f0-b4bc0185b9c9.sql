DROP POLICY "Anyone can view active templates" ON display_templates;
CREATE POLICY "Anyone can view active templates" ON display_templates
  FOR SELECT USING (true);