package io.masse.parityleaguestats;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.AsyncTask;
import android.os.Bundle;
import android.os.Environment;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.text.SimpleDateFormat;
import java.util.Date;

import io.masse.parityleaguestats.customLayout.customLinearLayout;
import io.masse.parityleaguestats.model.Team;
import io.masse.parityleaguestats.model.Teams;
import io.masse.parityleaguestats.tasks.uploadGame;

public class Stats extends Activity {
    private customLinearLayout layoutLeft;
    private customLinearLayout layoutRight;
    private ListView undoHistory;
    private Context context;

    private Button btnPull, btnPoint, btnDrop, btnD, btnCatchD,  btnThrowAway, btnUndo, btnMode;
    private TextView leftTeamName, rightTeamName, leftScore, rightScore;

    private View.OnClickListener mainOnClickListener;
    private View.OnClickListener changeModeListener;

    private final Stats myself = this;

    private Teams teams;
    private Bookkeeper bookkeeper;

    private Team leftTeam;
    private Team rightTeam;
    ArrayList<String> leftPlayers;
    ArrayList<String> rightPlayers;

    private ArrayAdapter<String> gameSummaryAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_stats);
        context = this;

        loadIntent();
        renderGameBar();
        initUndoView();
        createListeners();
        renderPlayers();
        setupButtons();

        updateUI();
    }

    private void loadIntent() {
        teams = (Teams)this.getIntent().getSerializableExtra("teams");
        bookkeeper = (Bookkeeper) this.getIntent().getSerializableExtra("bookkeeper");
        leftTeam = bookkeeper.homeTeam;
        rightTeam = bookkeeper.awayTeam;

        leftPlayers = (ArrayList<String>)this.getIntent().getSerializableExtra("leftPlayers");
        rightPlayers = (ArrayList<String>)this.getIntent().getSerializableExtra("rightPlayers");
    }

    private void renderGameBar() {
        leftTeamName = (TextView) findViewById(R.id.leftTeam);
        rightTeamName = (TextView) findViewById(R.id.rightTeam);

        leftTeamName.setText(bookkeeper.homeTeam.name);
        rightTeamName.setText(bookkeeper.awayTeam.name);

        leftScore = (TextView) findViewById(R.id.leftScore);
        rightScore = (TextView) findViewById(R.id.rightScore);

        leftScore.setText(bookkeeper.homeScore.toString());
        rightScore.setText(bookkeeper.awayScore.toString());
    }

    private void initUndoView() {
        undoHistory = (ListView) findViewById(R.id.listPlayByPlay);
        gameSummaryAdapter = new ArrayAdapter<>(this, R.layout.game_summary_event_view, R.id.title_text);
        undoHistory.setAdapter(gameSummaryAdapter);
    }

    private void createListeners() {
        mainOnClickListener = new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Button btn = (Button)view;
                String buttonText = btn.getText().toString();
                Boolean leftSideButton = btn.getParent() == layoutLeft;
                Boolean rightSideButton = btn.getParent() == layoutRight;

                if (leftSideButton) {
                    if (bookkeeper.shouldRecordNewPass()) {
                        bookkeeper.recordPass(buttonText);
                    } else {
                        bookkeeper.recordFirstActor(buttonText, true);
                    }

                } else if (rightSideButton) {
                    if (bookkeeper.shouldRecordNewPass()) {
                        bookkeeper.recordPass(buttonText);
                    } else {
                        bookkeeper.recordFirstActor(buttonText, false);
                    }

                } else if ((btn == btnD)) {
                    bookkeeper.recordD();

                } else if ((btn == btnCatchD)){
                    bookkeeper.recordCatchD();

                } else if ((btn == btnDrop)){
                    bookkeeper.recordDrop();

                } else if ((btn == btnPull)){
                    bookkeeper.recordPull();

                } else if ((btn == btnThrowAway)){
                    bookkeeper.recordThrowAway();

                } else if (btn == btnPoint) {
                    bookkeeper.recordPoint();
                    selectPlayers(true);

                } else if (btn == btnUndo) {
                    if (bookkeeper.activePoint == null) {
                        selectPlayers();
                    } else {
                        bookkeeper.undo();
                    }
                }

                updateUI();
            }
        };

        changeModeListener = new View.OnClickListener(){
            @Override
            public void onClick(View view) {
                selectPlayers();
            }
        };
    }

    private void renderPlayers() {
        layoutLeft = (customLinearLayout) findViewById(R.id.layoutLeftNames);
        layoutRight = (customLinearLayout) findViewById(R.id.layoutRightNames);

        leftTeamName.setText(leftTeam.name);
        Utils.draw_players(context, layoutLeft, mainOnClickListener, leftTeam, true);
        Utils.show_players(layoutLeft, leftPlayers);

        rightTeamName.setText(rightTeam.name);
        Utils.draw_players(context, layoutRight, mainOnClickListener, rightTeam, false);
        Utils.show_players(layoutRight, rightPlayers);
    }

    private void setupButtons() {
        btnPull = (Button) findViewById(R.id.btnPull);
        btnPoint = (Button) findViewById(R.id.btnPoint);
        btnDrop = (Button) findViewById(R.id.btnDrop);
        btnD = (Button) findViewById(R.id.btnD);
        btnCatchD = (Button) findViewById(R.id.btnCatchD);
        btnThrowAway = (Button) findViewById(R.id.btnThrowAway);
        btnUndo = (Button) findViewById(R.id.btnUndo);
        btnMode = (Button) findViewById(R.id.btnMode);

        btnUndo.setOnClickListener(mainOnClickListener);
        btnPoint.setOnClickListener(mainOnClickListener);
        btnDrop.setOnClickListener(mainOnClickListener);
        btnPull.setOnClickListener(mainOnClickListener);
        btnD.setOnClickListener(mainOnClickListener);
        btnCatchD.setOnClickListener(mainOnClickListener);
        btnThrowAway.setOnClickListener(mainOnClickListener);
        btnMode.setOnClickListener(changeModeListener);
    }

    @Override
    public void onPause(){
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        // Do nothing;
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.menu_stats, menu);
        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.action_select_players:
                selectPlayers();
                return true;
            case R.id.action_edit_players:
                editRosters();
                return true;
            case R.id.action_save_game:
                new AlertDialog.Builder(context)
                        .setTitle("Submit Game")
                        .setMessage("Submit this game?")
                        .setPositiveButton("Submit", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int whichButton) {
                                uploadGame();
                                resetApp();
                            }
                        }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int whichButton) {
                                // do nothing
                            }
                        }).show();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    private void editRosters() {
        Intent intent = new Intent(myself, EditRosters.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("teams", teams);
        bundle.putSerializable("bookkeeper", bookkeeper);
        bundle.putStringArrayList("leftPlayers", leftPlayers);
        bundle.putStringArrayList("rightPlayers", rightPlayers);
        intent.putExtras(bundle);
        intent.setFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        startActivity(intent);
    }

    private void selectPlayers() {
        selectPlayers(false);
    }

    private void selectPlayers(Boolean flipPlayers) {
        Intent intent = new Intent(context, SelectPlayers.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("teams", teams);
        bundle.putSerializable("bookkeeper", bookkeeper);
        if (flipPlayers) {
            HashSet<String> newLeftPlayers = new HashSet<>(leftTeam.getRoster());
            newLeftPlayers.removeAll(leftPlayers);
            bundle.putStringArrayList("leftPlayers", new ArrayList<>(newLeftPlayers));

            HashSet<String> newRightPlayers = new HashSet<>(rightTeam.getRoster());
            newRightPlayers.removeAll(rightPlayers);
            bundle.putStringArrayList("rightPlayers", new ArrayList<>(newRightPlayers));
        } else {
            bundle.putStringArrayList("leftPlayers", leftPlayers);
            bundle.putStringArrayList("rightPlayers", rightPlayers);
        }
        intent.putExtras(bundle);
        intent.setFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        startActivity(intent);
    }

    private void resetApp() {
        Intent intent = new Intent(myself, ChooseTeams.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
    }

    private void uploadGame() {
        try {
            String json = bookkeeper.serialize().toString();
            saveBackup(json);
            new uploadGame(context).execute(json);

        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(context, e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void saveBackup(String json) {
        try {
            File pathToExternalStorage = Environment.getExternalStorageDirectory();
            File backupDirectory = new File(pathToExternalStorage, "ParityLeagueStats");

            String timestamp = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss").format(new Date());

            String fileName = "ParityBackup_" + timestamp + ".json";

            backupDirectory.mkdir();

            File file = new File(backupDirectory, fileName);
            FileOutputStream fos = new FileOutputStream(file);
            fos.write(json.getBytes());
            fos.close();
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(context, e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void updateUI() {
        gameSummaryAdapter.clear();
        gameSummaryAdapter.addAll(bookkeeper.undoHistory());
        gameSummaryAdapter.notifyDataSetChanged();
        undoHistory.setSelection(gameSummaryAdapter.getCount() - 1);

        int state = bookkeeper.gameState();
        int leftCount = layoutLeft.getChildCount();
        int rightCount = layoutRight.getChildCount();

        switch (state) {
            case GameState.Normal:
                btnPoint.setEnabled(true);
                btnDrop.setEnabled(true);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnPull.setEnabled(false);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case GameState.FirstThrowQuebecVariant:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnPull.setEnabled(false);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case GameState.FirstD:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(true);
                btnCatchD.setEnabled(true);
                btnThrowAway.setEnabled(true);
                btnPull.setEnabled(false);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case GameState.Start:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnPull.setEnabled(false);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(true);
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(true);
                }
                break;

            case GameState.Pull:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnPull.setEnabled(true);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(false);
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(false);
                }
                break;

            case GameState.WhoPickedUpDisc:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnPull.setEnabled(false);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case GameState.SecondD:
                btnPoint.setEnabled(true);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnPull.setEnabled(false);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;
        }
    }
}
