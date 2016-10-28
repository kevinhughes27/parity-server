package io.masse.parityleaguestats;

import android.app.ProgressDialog;
import android.content.Context;
import android.os.AsyncTask;

import org.apache.http.HttpResponse;
import org.apache.http.entity.StringEntity;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.DefaultHttpClient;

class uploadGame extends AsyncTask<String, String, Long> {

    public Context context;
    private ProgressDialog dialog;

    public uploadGame(Context context) {
        this.context = context;
        this.dialog = new ProgressDialog(context);
    }

    @Override
    protected void onPreExecute() {
        this.dialog.setMessage("Uploading game");
        this.dialog.show();

    }

    @Override
    protected Long doInBackground(String... strings) {
        String url = "https://parity-server.herokuapp.com/upload";

        try {
            HttpClient httpclient = new DefaultHttpClient();
            HttpPost httpPost = new HttpPost(url);
            StringEntity se = new StringEntity(strings[0]);
            httpPost.setEntity(se);
            httpPost.setHeader("Accept", "application/json");
            httpPost.setHeader("Content-type", "application/json");
            HttpResponse httpResponse = httpclient.execute(httpPost);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    @Override
    protected void onPostExecute(Long result) {
        if (dialog != null && dialog.isShowing()) {
            dialog.dismiss();
        }
    }
}
