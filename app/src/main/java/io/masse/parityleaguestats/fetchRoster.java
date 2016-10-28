package io.masse.parityleaguestats;

import android.app.ProgressDialog;
import android.content.Context;
import android.os.AsyncTask;
import android.os.Environment;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.util.EntityUtils;
import java.io.File;
import java.io.FileOutputStream;

class fetchRoster extends AsyncTask<String, String, Long> {

    public Context context;
    private ProgressDialog dialog;
    private Stats parent;

    public fetchRoster(Context context, Stats parent) {
        this.context = context;
        this.dialog = new ProgressDialog(context);
        this.parent = parent;
    }

    @Override
    protected void onPreExecute() {
        this.dialog.setMessage("Fetching latest rosters");
        this.dialog.show();

    }

    @Override
    protected Long doInBackground(String... strings) {
        String strRosterUrl = "http://parity-server.herokuapp.com/teams";

        File fileStorageDirectory = Environment.getExternalStorageDirectory();
        String strAppDirectory = "ParityLeagueStats";
        String strFileName = "roster.JSON";

        try {
            HttpClient httpclient = new DefaultHttpClient();
            HttpGet httpget = new HttpGet(strRosterUrl);
            HttpResponse response = httpclient.execute(httpget);

            String resString = EntityUtils.toString(response.getEntity());

            File file = new File(fileStorageDirectory + "/" + strAppDirectory , strFileName);
            FileOutputStream fos;

            fos = new FileOutputStream(file);
            fos.write(resString.getBytes());
            fos.flush();
            fos.close();

        } catch (Exception e) {
            e.printStackTrace();
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