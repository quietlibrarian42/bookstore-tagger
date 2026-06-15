export interface Book {
  id:                     string
  isbn_13:                string
  title:                  string | null
  author:                 string | null
  translator:             string | null
  illustrator:            string | null
  publisher:              string | null
  publish_date:           string | null
  original_publish_date:  string | null
  original_language:      string | null
  pages:                  number | null
  author_nationality:     string | null
  author_country_of_birth:string | null
  author_gender:          string | null
  series_name:            string | null
  series_number:          number | null
  tag_genre:              string[] | null
  tag_subgenre:           string[] | null
  tag_era:                string | null
  tag_awards:             string[] | null
  tag_plot:               string[] | null
  tag_author_bg:          string[] | null
  content_warnings:       string[] | null
  age_suitability:        string | null
  shelf:                  string | null
  needs_tagging:          boolean
  tagged_at:              string | null
  created_at:             string
  updated_at:             string
}
