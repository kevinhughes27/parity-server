package io.masse.parityleaguestats;

import android.app.ProgressDialog;
import android.content.Context;
import android.os.AsyncTask;
import android.os.Environment;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.DefaultHttpClient;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URL;

/**
 * Created by mmasse on 15-01-08.
 * Loads roster from the Master sheet into roster.JSON
 */


class webRoster extends AsyncTask<String, String, Long> {

    public Context context;
    private ProgressDialog dialog;
    private Stats parent;

    public webRoster(Context context, Stats parent) {
        this.context = context;
        this.dialog = new ProgressDialog(context);
        this.parent = parent;
    }

    @Override
    protected void onPreExecute() {
        this.dialog.setMessage("Loading roster from Master Sheet (this takes up to 2 minutes)");
        this.dialog.show();

    }

    @Override
    protected Long doInBackground(String... strings) {

        File fileStorageDirectory = Environment.getExternalStorageDirectory();
        String strAppDirectory = "ParityLeagueStats";
        String strFileName = "roster.JSON";

        if (strings.length == 1) {

            String strRosterURL = strings[0];

            try {
                URL url = new URL(strRosterURL);
                HttpClient httpclient = new DefaultHttpClient(); // Create HTTP Client
                HttpGet httpget = new HttpGet(url.toURI()); // Set the action you want to do
                HttpResponse response = httpclient.execute(httpget); // Executeit
                HttpEntity entity = response.getEntity();
                InputStream is = entity.getContent(); // Create an InputStream with the response
                BufferedReader reader = new BufferedReader(new InputStreamReader(is, "iso-8859-1"), 8);
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null)
                    sb.append(line);

                String resString = sb.toString();

                is.close();

                File file = new File(fileStorageDirectory + "/" + strAppDirectory , strFileName);
                FileOutputStream fos;

                fos = new FileOutputStream(file);
                fos.write(resString.getBytes());
                fos.flush();
                fos.close();

            } catch (FileNotFoundException e) {
                e.printStackTrace ();
            } catch (IOException e) {
                e.printStackTrace ();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return null;
    }

    @Override
    protected void onPostExecute(Long result) {
        if (dialog != null && dialog.isShowing()) {
            dialog.dismiss();
            parent.loadJSON();
            parent.loadNewTeams();
        }
    }
}