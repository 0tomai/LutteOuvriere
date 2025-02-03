package fr.ul.lutteouvrire;

public class Article {
    private final String title;
    private final String link;
    private final String teaser;
    private final String imageUrl;
    private final String section;
    private final String date;

    public Article(String title, String link, String teaser, String imageUrl, String section, String date) {
        this.title = title;
        this.link = link;
        this.teaser = teaser;
        this.imageUrl = imageUrl;
        this.section = section;
        this.date = date;
    }

    public String getTitle() { return title; }
    public String getLink() { return link; }
    public String getTeaser() { return teaser; }
    public String getImageUrl() { return imageUrl; }
    public String getSection() { return section; }
    public String getDate() { return date; }
}
