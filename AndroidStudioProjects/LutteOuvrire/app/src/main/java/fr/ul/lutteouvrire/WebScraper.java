package fr.ul.lutteouvrire;

import android.os.AsyncTask;
import android.util.Log;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

public class WebScraper {

    /**
     * Récupère l'URL de l'image d'un article.
     *
     * @param articleElement L'élément HTML de l'article.
     * @return L'URL de l'image ou null si aucune image n'est trouvée.
     */
    private static String getImageUrl(Element articleElement) {
        Element imageElement = articleElement.select(".Teaser-img").first();
        if (imageElement != null) {
            String imageSrc = imageElement.attr("src");
            return imageSrc.startsWith("http") ? imageSrc : "https://www.lutte-ouvriere.org" + imageSrc;
        }
        return null;
    }

    /**
     * Récupère les articles d'une section spécifiée en arrière-plan.
     */
    public static class ScrapeAsyncTask extends AsyncTask<String, Void, List<Article>> {

        @Override
        protected List<Article> doInBackground(String... params) {
            String blockId = params[0];
            Log.i("WebScraper", "Début du scraping pour la section : " + blockId);
            List<Article> articles = new ArrayList<>();

            try {
                String url = "https://www.lutte-ouvriere.org/";

                Document doc = Jsoup.connect(url)
                        .timeout(10000)
                        .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36")
                        .get();

                Log.i("WebScraper", "Document HTML récupéré avec succès");

                Element section = doc.getElementById(blockId);
                if (section != null) {
                    Log.i("WebScraper", "Section trouvée : " + blockId);

                    Elements articleElements = section.select(".Teaser--large.editorial, .Teaser--large--without-picture.editorial, .Teaser--large.breve, .Teaser.editorial, .Teaser.breve, .Teaser--without-picture.article-du-journal");
                    Log.i("WebScraper", "Nombre d'articles trouvés : " + articleElements.size());

                    for (Element articleElement : articleElements) {
                        String articleTitle = articleElement.select("h2.Teaser-title--large, h3.Teaser-title").text();
                        String articleLink = articleElement.absUrl("href");
                        String articleTeaser = articleElement.select(".Teaser-teaser p, .Teaser-teaser").text();
                        String articleImage = getImageUrl(articleElement);

                        String articleDate = articleElement.select(".Teaser-metadata-date").text();

                        articles.add(new Article(articleTitle, articleLink, articleTeaser, articleImage, blockId, articleDate));
                        Log.i("WebScraper", "Article ajouté : " + articleTitle);
                    }
                } else {
                    Log.e("WebScraper", "Section non trouvée : " + blockId);
                }
            } catch (IOException e) {
                Log.e("WebScraper", "Erreur lors du scraping : " + e.getMessage());
            }

            Log.i("WebScraper", "Scraping terminé. Nombre d'articles : " + articles.size());
            return articles;
        }

        @Override
        protected void onPostExecute(List<Article> articles) {
            super.onPostExecute(articles);
        }
    }

    public static class ScrapeMensuelAsyncTask extends AsyncTask<Void, Void, List<Article>> {
        private OnScrapeCompleteListener listener;

        public ScrapeMensuelAsyncTask(OnScrapeCompleteListener listener) {
            this.listener = listener;
        }

        @Override
        protected List<Article> doInBackground(Void... voids) {
            return WebScraper.scrapeMensuel();
        }

        @Override
        protected void onPostExecute(List<Article> articles) {
            if (listener != null) {
                listener.onScrapeComplete(articles);
            }
        }

        public interface OnScrapeCompleteListener {
            void onScrapeComplete(List<Article> articles);
        }
    }

    // Nouvelle classe pour CLT
    public static class ScrapeCLTAsyncTask extends AsyncTask<Void, Void, List<Article>> {
        private OnScrapeCompleteListener listener;

        public ScrapeCLTAsyncTask(OnScrapeCompleteListener listener) {
            this.listener = listener;
        }

        @Override
        protected List<Article> doInBackground(Void... voids) {
            return WebScraper.scrapeCLT();
        }

        @Override
        protected void onPostExecute(List<Article> articles) {
            if (listener != null) {
                listener.onScrapeComplete(articles);
            }
        }

        public interface OnScrapeCompleteListener {
            void onScrapeComplete(List<Article> articles);
        }
    }

    public static List<Article> scrapeMensuel() {
        Log.i("ScraperMens", "Début de scrapeMensuel");
        List<Article> articles = new ArrayList<>();
        Set<String> uniqueLinks = new HashSet<>(); // Pour éviter les doublons

        try {
            Log.i("ScraperMens", "Connexion à l'URL...");
            String url = "https://www.lutte-ouvriere.org/mensuel/";
            Document doc = Jsoup.connect(url)
                    .timeout(10000)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36")
                    .get();

            Log.i("ScraperMens", "Document HTML récupéré avec succès");

            Log.i("ScraperMens", "Recherche des éléments...");
            Elements articleElements = doc.select("ul.UneMensuel-list li a.lien-mensuel");

            if (articleElements.isEmpty()) {
                Log.e("ScraperMens", "Aucun article trouvé dans la liste mensuelle");
            } else {
                Log.i("ScraperMens", "Nombre d'articles trouvés : " + articleElements.size());

                for (Element articleElement : articleElements) {
                    String articleTitle = articleElement.text();
                    String articleLink = articleElement.absUrl("href");

                    // Vérifier les doublons
                    if (!uniqueLinks.contains(articleLink) && !articleTitle.isEmpty()) {
                        uniqueLinks.add(articleLink);
                        Log.i("ScraperMens", "Article trouvé : " + articleTitle + " (" + articleLink + ")");
                        articles.add(new Article(articleTitle, articleLink, "", null, "Mensuel", ""));
                    } else {
                        Log.w("ScraperMens", "Article dupliqué ignoré : " + articleTitle);
                    }
                }
            }
        } catch (IOException e) {
            Log.e("ScraperMens", "Erreur lors du scraping : " + e.getMessage());
        }

        Log.i("ScraperMens", "Scraping terminé. Nombre d'articles uniques : " + articles.size());
        return articles;
    }

    public static List<Article> scrapeCLT() {
        Log.i("ScraperCLT", "Début de scrapeCLT");
        List<Article> articles = new ArrayList<>();
        Set<String> uniqueLinks = new HashSet<>();

        // Mots-clés à exclure
        Set<String> excludedTitles = new HashSet<>();
        excludedTitles.add("Accueil");
        excludedTitles.add("Archives");
        excludedTitles.add("Cercle Léon Trotsky");
        excludedTitles.add("Voir les numéros précédents");

        try {
            scrapeCLTArchives("https://www.lutte-ouvriere.org/clt/archives.html", articles, uniqueLinks, excludedTitles);

        } catch (Exception e) {
            Log.e("ScraperCLT", "Erreur lors du scraping : " + e.getMessage());
        }

        Log.i("ScraperCLT", "Scraping terminé. Nombre de conférences : " + articles.size());
        return articles;
    }

    private static void scrapeCLTArchives(String url, List<Article> articles, Set<String> uniqueLinks, Set<String> excludedTitles) {
        try {
            Log.i("ScraperCLTArchives", "Connexion aux archives : " + url);
            Document doc = Jsoup.connect(url)
                    .timeout(10000)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36")
                    .get();

            Log.i("ScraperCLTArchives", "Document archives récupéré avec succès");

            // Chercher les liens vers les numéros archivés
            Elements archiveElements = doc.select("a[href*='/clt/']");

            for (Element archiveElement : archiveElements) {
                String archiveTitle = archiveElement.text().trim();
                String archiveLink = archiveElement.absUrl("href");

                // Filtrer et éviter les doublons
                if (!archiveTitle.isEmpty() && !archiveLink.isEmpty()
                        && !excludedTitles.contains(archiveTitle)
                        && !uniqueLinks.contains(archiveLink)
                        && !archiveLink.equals(url)
                        && !archiveLink.equals("https://www.lutte-ouvriere.org/clt/")) {

                    uniqueLinks.add(archiveLink);

                    // Récupérer le numéro associé à ce lien spécifique
                    String articleNum = getNumeroForLink(archiveElement, doc);

                    Log.i("ScraperCLTArchives", "Archive trouvée : " + archiveTitle + " (Numéro: " + articleNum + ")");
                    articles.add(new Article(archiveTitle, archiveLink, articleNum, null, "CLT", ""));
                }
            }

        } catch (IOException e) {
            Log.e("ScraperCLTArchives", "Erreur lors du scraping des archives : " + e.getMessage());
        }
    }

    /**
     * Récupère le numéro associé à un lien spécifique dans la page d'archives
     * @param linkElement L'élément du lien
     * @param doc Le document de la page d'archives
     * @return Le numéro de la conférence ou "-" si non trouvé
     */
    private static String getNumeroForLink(Element linkElement, Document doc) {
        try {
            // Chercher le div.numero le plus proche de ce lien
            Element parentElement = linkElement.parent();

            // Remonter dans la hiérarchie pour trouver le conteneur principal
            while (parentElement != null) {
                // Chercher un div.numero dans ce conteneur
                Element numeroElement = parentElement.selectFirst("div.numero");
                if (numeroElement != null) {
                    String numero = numeroElement.text().trim();
                    Log.d("ScraperCLT", "Numéro trouvé pour le lien : " + numero);
                    return numero;
                }
                parentElement = parentElement.parent();
            }

            // Si pas trouvé avec la méthode parent, essayer de trouver le div.numero précédent
            Element precedingNumero = null;
            Elements allElements = doc.select("*");

            for (Element element : allElements) {
                if (element.hasClass("numero")) {
                    precedingNumero = element;
                } else if (element == linkElement && precedingNumero != null) {
                    String numero = precedingNumero.text().trim();
                    Log.d("ScraperCLT", "Numéro trouvé (précédent) : " + numero);
                    return numero;
                }
            }

            Log.w("ScraperCLT", "Aucun numéro trouvé pour le lien");
            return "-";

        } catch (Exception e) {
            Log.e("ScraperCLT", "Erreur lors de la récupération du numéro : " + e.getMessage());
            return "-";
        }
    }
}